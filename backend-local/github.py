from urllib.parse import urlparse
import httpx

# GitHub Contents API
CONTENTS_URL = "https://api.github.com/repos/{owner}/{repo}/contents/{path}"

# Supported dependency files (order matters)
SUPPORTED_FILES = [
    ("package.json", "node"),
    ("requirements.txt", "python"),
    ("pyproject.toml", "python"),
    ("go.mod", "go"),
    ("Cargo.toml", "rust"),
]


def parse_github_url(url: str):
    """
    Converts:
        https://github.com/owner/repo

    Into:
        ("owner", "repo")
    """

    parsed = urlparse(url)
    parts = parsed.path.strip("/").split("/")

    if len(parts) < 2:
        raise ValueError("Invalid GitHub repository URL")

    owner = parts[0]
    repo = parts[1]

    return owner, repo


def fetch_file(owner: str, repo: str, filepath: str, token: str = None):

    headers = {
        "Accept": "application/vnd.github.v3.raw"
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = CONTENTS_URL.format(
        owner=owner,
        repo=repo,
        path=filepath
    )

    

    response = httpx.get(
    url,
    headers=headers,
    follow_redirects=True,
    timeout=20
)


    return response


def find_dependency_file(owner: str, repo: str, token: str = None):
    """
    Looks for a supported dependency file in the repository root.
    Returns its language, filename and content.
    """

    for filename, language in SUPPORTED_FILES:

        response = fetch_file(
            owner,
            repo,
            filename,
            token
        )

        if response.status_code == 200:
            return {
                "language": language,
                "filename": filename,
                "content": response.text
            }

        # Repository doesn't exist or is private without token
        if response.status_code == 404:
            continue

        # GitHub API rate limit
        if response.status_code == 403:
            return {
        "status": "error",
        "code": "GITHUB_RATE_LIMIT",
        "message": "GitHub API rate limit exceeded"
    }

    return None