from collections import Counter
import json as _json
import os

from detector import detect_dependency_file
from github import parse_github_url, find_dependency_file
from cycle_detector import detect_cycles
from github_traversal import GITHUB_PERMISSION_ERROR

from scanner import scan_repo
from metrics import count_loc
from import_parser import extract_imports
from resolver import resolve_import, build_file_lookup
from github_traversal import traverse_repo

from parsers import (
    parse_node,
    parse_python,
    parse_go,
    parse_rust,
)
from config import OPENROUTER_API_KEY, GEMINI_API_KEY
from gemini import summarize_repo

LLM_API_KEY = OPENROUTER_API_KEY or GEMINI_API_KEY

PARSERS = {
    "node": parse_node,
    "python": parse_python,
    "go": parse_go,
    "rust": parse_rust,
}

LANG_DISPLAY = {
    "ts": "TypeScript",
    "python": "Python",
    "go": "Go",
    "rust": "Rust",
}


# -----------------------------
# LANGUAGE DETECTION
# -----------------------------
def detect_language(file_name: str):

    if file_name.endswith((".ts", ".js", ".tsx", ".jsx")):
        return "ts"

    if file_name.endswith(".py"):
        return "python"

    if file_name.endswith(".go"):
        return "go"

    if file_name.endswith(".rs"):
        return "rust"

    return None


def dominant_language(files):
    counts = Counter(
        detect_language(f["name"]) for f in files
        if detect_language(f["name"])
    )
    if not counts:
        return "unknown"
    return LANG_DISPLAY.get(counts.most_common(1)[0][0], counts.most_common(1)[0][0])


# -----------------------------
# WORKSPACE MAP
# Build: { "@repo/ui": "packages/ui", "web": "apps/web", ... }
# from all package.json files found in the repo.
# -----------------------------
def build_workspace_map(files: list, repo_path: str | None = None) -> dict:
    workspace_map: dict[str, str] = {}

    # From in-memory file list (GitHub tarball or any files with "content")
    for f in files:
        if f["name"] != "package.json":
            continue
        try:
            content = f.get("content") or open(f["path"], encoding="utf-8").read()
            pkg = _json.loads(content)
            name = pkg.get("name", "")
            if name:
                pkg_dir = "/".join(f["relative"].replace("\\", "/").split("/")[:-1])
                workspace_map[name] = pkg_dir
        except Exception:
            continue

    # Also walk local repo for package.json files not already in files list
    if repo_path:
        ignore = {"node_modules", ".git", "__pycache__", ".next", "dist", "build", ".venv", "venv"}
        for root, dirs, filenames in os.walk(repo_path):
            dirs[:] = [d for d in dirs if d not in ignore]
            if "package.json" in filenames:
                full = os.path.join(root, "package.json")
                rel  = os.path.relpath(full, repo_path).replace("\\", "/")
                pkg_dir = "/".join(rel.split("/")[:-1])
                try:
                    with open(full, encoding="utf-8") as fp:
                        pkg = _json.load(fp)
                    name = pkg.get("name", "")
                    if name:
                        workspace_map[name] = pkg_dir
                except Exception:
                    continue

    return workspace_map


# -----------------------------
# ENTRY POINT DETECTION
# -----------------------------
_ENTRY_NAMES = {
    "main.ts", "main.tsx", "main.js", "main.jsx",
    "main.py", "main.go", "main.rs",
    "index.ts", "index.tsx", "index.js",
    "app.ts", "app.tsx", "app.py",
    "server.ts", "server.js", "server.py",
    "__main__.py",
}

def detect_entry_points(nodes: list, edges: list, top_n: int = 8) -> list:
    in_degree = {n["id"]: 0 for n in nodes}
    for e in edges:
        if e["target"] in in_degree:
            in_degree[e["target"]] += 1

    seen: set = set()
    entry_points = []

    for n in nodes:
        if n["label"] in _ENTRY_NAMES:
            entry_points.append({
                "id": n["id"],
                "label": n["label"],
                "package": n.get("package"),
                "reason": "application entry point",
                "in_degree": in_degree.get(n["id"], 0),
            })
            seen.add(n["id"])

    for n in sorted(
        [n for n in nodes if n["id"] not in seen],
        key=lambda n: in_degree.get(n["id"], 0),
        reverse=True,
    ):
        deg = in_degree.get(n["id"], 0)
        if deg < 2 or len(entry_points) >= top_n:
            break
        entry_points.append({
            "id": n["id"],
            "label": n["label"],
            "package": n.get("package"),
            "reason": f"imported by {deg} files",
            "in_degree": deg,
        })
        seen.add(n["id"])

    return entry_points[:top_n]


# -----------------------------
# PACKAGE RESOLVER
# -----------------------------
def get_package_for_file(relative_path: str, workspace_map: dict) -> str | None:
    dir_to_name = {v: k for k, v in workspace_map.items()}
    rel = relative_path.replace("\\", "/")
    for pkg_dir in sorted(dir_to_name.keys(), key=len, reverse=True):
        if rel.startswith(pkg_dir + "/") or rel == pkg_dir:
            return dir_to_name[pkg_dir]
    return None


# -----------------------------
# CORE GRAPH BUILDER
# -----------------------------
def build_file_graph(files, workspace_map: dict | None = None):

    nodes = []
    edges = []
    total_loc = 0

    for f in files:
        try:
            if "content" in f:
                loc = sum(1 for line in f["content"].splitlines() if line.strip())
            else:
                loc = count_loc(f["path"])
        except Exception:
            loc = 0

        total_loc += loc

        nodes.append({
            "id": f["relative"].replace("\\", "/"),
            "label": f["name"],
            "type": "file",
            "loc": loc,
            "package": get_package_for_file(f["relative"], workspace_map or {}),
        })

    file_lookup = build_file_lookup(files)

    for f in files:

        try:
            if "content" in f:
                content = f["content"]
            else:
                with open(f["path"], "r", encoding="utf-8") as file:
                    content = file.read()

            lang = detect_language(f["name"])
            if not lang:
                continue

            imports = extract_imports(content, lang)

            for imp in imports:
                resolved = resolve_import(imp, f["relative"], file_lookup, workspace_map or {})

                if resolved:
                    edges.append({
                        "source": f["relative"].replace("\\", "/"),
                        "target": resolved.replace("\\", "/"),
                        "source_package": get_package_for_file(f["relative"], workspace_map or {}),
                        "target_package": get_package_for_file(resolved, workspace_map or {}),
                    })

        except Exception:
            continue

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "total_files": len(files),
            "total_loc": total_loc,
            "total_edges": len(edges),
            "language": dominant_language(files),
        }
    }


# -----------------------------
# LOCAL ANALYSIS
# -----------------------------
def analyze_local_repo(repo_path: str):

    files = scan_repo(repo_path)
    workspace_map = build_workspace_map(files, repo_path=repo_path)

    graph = build_file_graph(files, workspace_map)
    cycles = detect_cycles(graph["nodes"], graph["edges"])
    entry_points = detect_entry_points(graph["nodes"], graph["edges"])

    repo_summary = ""
    if LLM_API_KEY:
        try:
            repo_summary = summarize_repo(
                api_key=LLM_API_KEY,
                language=graph["meta"]["language"],
                total_files=len(files),
                total_loc=graph["meta"]["total_loc"],
                entry_points=entry_points,
                workspace_map=workspace_map,
            )
        except Exception as e:
            print(f"[analyzer] summarize_repo error: {e}", flush=True)

    return {
        "status": "success",
        "graph": {"nodes": graph["nodes"], "edges": graph["edges"]},
        "meta": {
            **graph["meta"],
            "cycles_found": len(cycles),
            "entry_points": entry_points,
            "repo_summary": repo_summary,
        },
        "cycles": cycles,
    }


# -----------------------------
# GITHUB ANALYSIS
# -----------------------------
def analyze_github_repo(url: str, token: str = None, progress_cb=None):

    try:
        owner, repo = parse_github_url(url)
    except ValueError:
        return {
            "status": "error",
            "code": "INVALID_GITHUB_URL",
        }

    files = traverse_repo(owner, repo, token, progress_cb=progress_cb)

    if files is GITHUB_PERMISSION_ERROR:
        return {
            "status": "error",
            "code": "GITHUB_PERMISSION_ERROR",
            "message": "GitHub returned 403/401 — token lacks repo scope.",
        }

    if not files:
        return {
            "status": "error",
            "code": "EMPTY_REPO",
            "message": "No supported code files found",
        }

    workspace_map = build_workspace_map(files)
    graph = build_file_graph(files, workspace_map)
    cycles = detect_cycles(graph["nodes"], graph["edges"])
    entry_points = detect_entry_points(graph["nodes"], graph["edges"])

    repo_summary = ""
    if LLM_API_KEY:
        try:
            repo_summary = summarize_repo(
                api_key=LLM_API_KEY,
                language=graph["meta"]["language"],
                total_files=len(files),
                total_loc=graph["meta"]["total_loc"],
                entry_points=entry_points,
                workspace_map=workspace_map,
            )
        except Exception as e:
            print(f"[analyzer] summarize_repo error: {e}", flush=True)

    return {
        "status": "success",
        "graph": {"nodes": graph["nodes"], "edges": graph["edges"]},
        "meta": {
            **graph["meta"],
            "repo": url,
            "source": "github_full_traversal",
            "cycles_found": len(cycles),
            "entry_points": entry_points,
            "repo_summary": repo_summary,
        },
        "cycles": cycles,
    }