import httpx

GITHUB_API = "https://api.github.com/repos/{owner}/{repo}/contents/{path}"

SUPPORTED_EXTENSIONS = (
    ".ts", ".js", ".tsx", ".jsx",
    ".py",
    ".go",
    ".rs"
)


def is_code_file(name: str):
    return name.endswith(SUPPORTED_EXTENSIONS)


def fetch_tree(owner, repo, path="", token=None):

    url = GITHUB_API.format(owner=owner, repo=repo, path=path)

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    response = httpx.get(url, headers=headers)

    if response.status_code != 200:
        return []

    return response.json()


def traverse_repo(owner, repo, token=None, path=""):

    items = fetch_tree(owner, repo, path, token)

    files = []

    for item in items:

        # folder
        if item["type"] == "dir":
            files.extend(
                traverse_repo(owner, repo, token, item["path"])
            )

        # file
        elif item["type"] == "file" and is_code_file(item["name"]):

            content_resp = httpx.get(item["download_url"])

            if content_resp.status_code == 200:
                files.append({
                    "path": item["path"],
                    "relative": item["path"],
                    "name": item["name"],
                    "content": content_resp.text
                })

    return files