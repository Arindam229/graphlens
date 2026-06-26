from detector import detect_dependency_file
from github import parse_github_url, find_dependency_file
from cycle_detector import detect_cycles
import os

from scanner import scan_repo
from metrics import count_loc
from import_parser import extract_imports
from resolver import resolve_import

from parsers import (
    parse_node,
    parse_python,
    parse_go,
    parse_rust,
)

PARSERS = {
    "node": parse_node,
    "python": parse_python,
    "go": parse_go,
    "rust": parse_rust,
}


# -----------------------------
# LANGUAGE DETECTION
# -----------------------------
def detect_language(file_name: str):
    # FIX: Mapped exactly to PARSERS keys and added missing Go/Rust support
    if file_name.endswith((".ts", ".js", ".tsx", ".jsx")):
        return "node" 

    if file_name.endswith(".py"):
        return "python"
        
    if file_name.endswith(".go"):
        return "go"
        
    if file_name.endswith(".rs"):
        return "rust"

    return None


# -----------------------------
# CORE GRAPH BUILDER
# -----------------------------
def build_file_graph(files):

    nodes = []
    edges = []
    total_loc = 0

    for f in files:
        # FIX: Added try/except. Fake remote paths (like those from GitHub) 
        # will cause count_loc to crash if we don't catch the error.
        try:
            loc = count_loc(f["path"])
        except Exception:
            loc = 0
            
        total_loc += loc

        nodes.append({
            "id": f["relative"],
            "label": f["name"],
            "type": "file",
            "loc": loc
        })

    for f in files:
        try:
            # Note: This will silently fail and "continue" for the fake GitHub files, 
            # which is exactly what we want until a remote file downloader is built.
            with open(f["path"], "r", encoding="utf-8") as file:
                content = file.read()

            lang = detect_language(f["name"])
            if not lang:
                continue

            imports = extract_imports(content, lang)

            for imp in imports:
                resolved = resolve_import(imp, f["relative"], files)

                if resolved:
                    edges.append({
                        "source": f["relative"],
                        "target": resolved
                    })

        except Exception:
            continue

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "total_files": len(files),
            "total_loc": total_loc,
            "total_edges": len(edges)
        }
    }


# -----------------------------
# LOCAL ANALYSIS
# -----------------------------
def analyze_local_repo(repo_path: str):

    files = scan_repo(repo_path)
    graph = build_file_graph(files)
    cycles = detect_cycles(graph["nodes"], graph["edges"])

    return {
        "status": "success",
        "graph": {
            "nodes": graph["nodes"],
            "edges": graph["edges"]
        },
        "meta": {
            **graph["meta"],
            "cycles_found": len(cycles)
        },
        "cycles": cycles
    }


# -----------------------------
# GITHUB ANALYSIS
# -----------------------------
def analyze_github_repo(url: str, token: str = None):

    try:
        owner, repo = parse_github_url(url)
    except ValueError:
        return {
            "status": "error",
            "code": "INVALID_GITHUB_URL",
        }

    dep = find_dependency_file(owner, repo, token)

    if isinstance(dep, dict) and dep.get("status") == "error":
        return dep

    if dep is None:
        return {
            "status": "error",
            "code": "NO_DEP_FILE",
        }

    # ⚠️ TEMP: still single-file analysis (upgrade later)
    # The try/catch blocks in build_file_graph now ensure this 
    # fake path won't crash the entire program.
    fake_files = [{
        "path": "/github/" + dep["filename"],
        "relative": dep["filename"],
        "name": dep["filename"]
    }]

    graph = build_file_graph(fake_files)
    cycles = detect_cycles(graph["nodes"], graph["edges"])

    return {
        "status": "success",
        "graph": {
            "nodes": graph["nodes"],
            "edges": graph["edges"]
        },
        "meta": {
            **graph["meta"],
            "repo": url,
            "language": dep["language"],
            "source": "github"
        },
        "cycles": cycles
    }