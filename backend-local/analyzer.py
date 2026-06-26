from detector import detect_dependency_file
from parsers import (
    parse_node,
    parse_python,
    parse_go,
    parse_rust,
)

def analyze_local_repo(repo_path: str):
    dep = detect_dependency_file(repo_path)

    if dep is None:
        return {
            "status": "error",
            "code": "NO_DEP_FILE",
            "message": "No supported dependency file found in repo root"
        }

    with open(dep["path"], "r", encoding="utf-8") as f:
        content = f.read()

    if dep["language"] == "node":
        graph = parse_node(content)

    elif dep["language"] == "python":
        graph = parse_python(content)

    elif dep["language"] == "go":
        graph = parse_go(content)

    elif dep["language"] == "rust":
        graph = parse_rust(content)

    return {
        "status": "success",
        "graph": graph,
        "meta": {
            "language": dep["language"],
            "repo": repo_path,
            "dep_count": len(graph["nodes"]) - 1,
            "circular_count": 0
        }
    }