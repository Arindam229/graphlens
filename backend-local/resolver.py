import os

# JS/TS index file candidates for a given directory
_JS_INDEX = ("index.ts", "index.tsx", "index.js", "index.jsx")
_JS_EXT   = (".ts", ".tsx", ".js", ".jsx")


def _find_by_rel(candidate: str, file_lookup: dict):
    candidate = candidate.replace("\\", "/").strip("/")
    f = file_lookup.get(candidate)
    return f["relative"] if f else None


def build_file_lookup(all_files: list) -> dict:
    return {f["relative"].replace("\\", "/").strip("/"): f for f in all_files}


def _js_candidates(base: str, sub: str) -> list[str]:
    """Return candidate paths for a JS/TS import of `sub` inside `base` dir."""
    results = []
    if sub:
        results += [f"{base}/{sub}{ext}" for ext in _JS_EXT]
        results += [f"{base}/{sub}/index{ext}" for ext in (".ts", ".tsx", ".js")]
    else:
        results += [f"{base}/{idx}" for idx in _JS_INDEX]
    return results


def _resolve_go_import(import_path: str, file_lookup: dict) -> str | None:
    # Strip progressively longer module prefixes until we find a file match
    parts = import_path.strip("/").split("/")
    for start in range(len(parts)):
        suffix = "/".join(parts[start:])
        hit = file_lookup.get(suffix + ".go")
        if hit:
            return hit["relative"]
        # directory package: look for any .go file inside that dir
        for key, f in file_lookup.items():
            if key.startswith(suffix + "/") and key.endswith(".go"):
                return f["relative"]
    return None


def _resolve_rust_use(use_path: str, file_lookup: dict) -> str | None:
    # crate::a::b → try src/a/b.rs, src/a/b/mod.rs, a/b.rs, a/b/mod.rs
    path = use_path.split("::", 1)[-1].replace("::", "/")
    for candidate in [
        f"src/{path}.rs", f"src/{path}/mod.rs",
        f"{path}.rs",     f"{path}/mod.rs",
    ]:
        hit = file_lookup.get(candidate.strip("/"))
        if hit:
            return hit["relative"]
    return None


def resolve_import(import_path: str, current_file: str, file_lookup: dict, workspace_map: dict | None = None):
    base_dir = current_file.replace("\\", "/").rsplit("/", 1)[0] if "/" in current_file else ""

    # ── 1. Relative imports (./foo, ../bar, .utils) ──
    if import_path.startswith("."):
        dots = len(import_path) - len(import_path.lstrip("."))
        rest = import_path.lstrip(".")

        parts = base_dir.split("/") if base_dir else []
        up = dots - 1
        pkg_parts = parts[:len(parts) - up] if up <= len(parts) else []
        pkg_dir = "/".join(pkg_parts)

        if rest:
            module = rest.lstrip("/").replace(".", "/")
            for c in _js_candidates(pkg_dir, module):
                hit = _find_by_rel(c, file_lookup)
                if hit:
                    return hit
            for suffix in (f"{module}.py", f"{module}/__init__.py"):
                hit = _find_by_rel(f"{pkg_dir}/{suffix}" if pkg_dir else suffix, file_lookup)
                if hit:
                    return hit
        else:
            for idx in list(_JS_INDEX) + ["__init__.py"]:
                hit = _find_by_rel(f"{pkg_dir}/{idx}" if pkg_dir else idx, file_lookup)
                if hit:
                    return hit
        return None

    # ── 2. Next.js / Vite @/ path alias  (@/components/Button → <app>/src/components/Button) ──
    if import_path.startswith("@/") and workspace_map is not None:
        sub = import_path[2:]
        dir_to_name = {v: k for k, v in workspace_map.items()}
        current_rel = current_file.replace("\\", "/")
        pkg_dir = None
        for d in sorted(dir_to_name.keys(), key=len, reverse=True):
            if current_rel.startswith(d + "/"):
                pkg_dir = d
                break
        if pkg_dir:
            for base in [f"{pkg_dir}/src", pkg_dir]:
                for c in _js_candidates(base, sub):
                    hit = _find_by_rel(c, file_lookup)
                    if hit:
                        return hit
        return None

    # ── 3. Workspace / monorepo package imports (@repo/ui, @repo/database) ──
    if workspace_map and import_path.startswith("@"):
        for pkg_name, pkg_dir in workspace_map.items():
            if import_path == pkg_name or import_path.startswith(pkg_name + "/"):
                sub = import_path[len(pkg_name):].lstrip("/")
                search_roots = [pkg_dir, f"{pkg_dir}/src", f"{pkg_dir}/lib", f"{pkg_dir}/dist"]
                for root in search_roots:
                    for c in _js_candidates(root, sub):
                        hit = _find_by_rel(c, file_lookup)
                        if hit:
                            return hit
                break

    # ── 4. Go imports ──
    if current_file.endswith(".go"):
        return _resolve_go_import(import_path, file_lookup)

    # ── 5. Rust use paths (crate::, super::, self::) ──
    if current_file.endswith(".rs") and "::" in import_path:
        return _resolve_rust_use(import_path, file_lookup)

    # ── 6. Absolute Python imports (config, models.base) ──
    module_path = import_path.replace(".", "/")
    base_name   = module_path.split("/")[-1]

    for suffix in (f"{module_path}.py", f"{module_path}/__init__.py"):
        hit = _find_by_rel(suffix, file_lookup)
        if hit:
            return hit

    # Basename fallback (only for names ≥ 2 chars to avoid "os" false hits)
    if len(base_name) >= 2:
        for f in file_lookup.values():
            name = f["relative"].replace("\\", "/").split("/")[-1]
            if name == base_name + ".py":
                return f["relative"]

    return None
