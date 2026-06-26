from detector import detect_dependency_file
from github import (
    parse_github_url,
    find_dependency_file,
)

from parsers import (
    parse_node,
    parse_python,
    parse_go,
    parse_rust,
)

# Map language -> parser function
PARSERS = {
    "node": parse_node,
    "python": parse_python,
    "go": parse_go,
    "rust": parse_rust,
}


def analyze_local_repo(repo_path: str):
    dep = detect_dependency_file(repo_path)

    if dep is None:
        return {
            "status": "error",
            "code": "NO_DEP_FILE",
            "message": "No supported dependency file found in repo root",
        }

    with open(dep["path"], "r", encoding="utf-8") as f:
        content = f.read()

    parser = PARSERS.get(dep["language"])

    if parser is None:
        return {
            "status": "error",
            "code": "PARSE_FAILED",
            "message": "Unsupported language",
        }

    graph = parser(content)

    return {
        "status": "success",
        "graph": graph,
        "meta": {
            "repo": repo_path,
            "language": dep["language"],
            "dep_count": len(graph["nodes"]) - 1,
            "circular_count": 0,
        },
    }


def analyze_github_repo(url: str, token: str = None):
    """
    Analyze a GitHub repository by downloading its dependency file.
    """

    try:
        owner, repo = parse_github_url(url)
    except ValueError:
        return {
            "status": "error",
            "code": "INVALID_GITHUB_URL",
            "message": "Invalid GitHub repository URL",
        }

    dep = find_dependency_file(owner, repo, token)

    if isinstance(dep, dict) and dep.get("status") == "error":
        return dep

    if dep is None:
        return {
            "status": "error",
            "code": "NO_DEP_FILE",
            "message": "No supported dependency file found in repo root",
        }

    parser = PARSERS.get(dep["language"])

    if parser is None:
        return {
            "status": "error",
            "code": "PARSE_FAILED",
            "message": "Unsupported language",
        }

    graph = parser(dep["content"])

    return {
        "status": "success",
        "graph": graph,
        "meta": {
            "repo": url,
            "language": dep["language"],
            "dep_count": len(graph["nodes"]) - 1,
            "circular_count": 0,
        },
    }