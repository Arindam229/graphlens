import io
import tarfile
import httpx

SUPPORTED_EXTENSIONS = (
    ".ts", ".js", ".tsx", ".jsx",
    ".py", ".go", ".rs",
)

MAX_FILES      = 1000
MAX_SIZE_BYTES = 512 * 1024   # 512 KB per file
MAX_REPO_MB    = 150          # skip repos with tarball > 150 MB
_TIMEOUT       = 120          # tarball download can take a moment

GITHUB_PERMISSION_ERROR = "__GITHUB_PERMISSION_ERROR__"

REPO_API    = "https://api.github.com/repos/{owner}/{repo}"
TARBALL_API = "https://api.github.com/repos/{owner}/{repo}/tarball/{branch}"


def _headers(token):
    h = {"Accept": "application/vnd.github+json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _repo_info(owner: str, repo: str, token) -> dict | str:
    try:
        r = httpx.get(REPO_API.format(owner=owner, repo=repo),
                      headers=_headers(token), timeout=15)
        if r.status_code in (401, 403):
            return GITHUB_PERMISSION_ERROR
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[github] repo info error: {e}", flush=True)
    return {}


def traverse_repo(owner: str, repo: str, token=None, progress_cb=None):
    def emit(msg: str):
        print(f"[github] {msg}", flush=True)
        if progress_cb:
            progress_cb(msg)

    # 1. Get repo metadata (branch + size estimate)
    emit("Fetching repository info...")
    info = _repo_info(owner, repo, token)
    if info is GITHUB_PERMISSION_ERROR:
        return GITHUB_PERMISSION_ERROR

    branch = info.get("default_branch", "main")
    size_kb = info.get("size", 0)  # GitHub reports size in KB
    emit(f"Repository: {owner}/{repo} ({size_kb / 1024:.1f} MB, branch: {branch})")

    if size_kb / 1024 > MAX_REPO_MB:
        emit(f"Repo too large ({size_kb / 1024:.0f} MB > {MAX_REPO_MB} MB limit). Truncating.")

    # 2. Download tarball (single request — GitHub compresses it)
    tarball_url = TARBALL_API.format(owner=owner, repo=repo, branch=branch)
    emit("Downloading repository tarball (compressed)...")
    try:
        r = httpx.get(
            tarball_url,
            headers=_headers(token),
            follow_redirects=True,
            timeout=_TIMEOUT,
        )
        if r.status_code in (401, 403):
            return GITHUB_PERMISSION_ERROR
        if r.status_code != 200:
            emit(f"Tarball download failed (HTTP {r.status_code})")
            return []
    except Exception as e:
        emit(f"Tarball download error: {e}")
        return []

    compressed_mb = len(r.content) / (1024 * 1024)
    emit(f"Downloaded {compressed_mb:.1f} MB compressed — extracting code files...")

    # 3. Extract code files from tarball in memory
    files: list[dict] = []
    try:
        buf = io.BytesIO(r.content)
        with tarfile.open(fileobj=buf, mode="r:gz") as tar:
            members = tar.getmembers()
            code_members = [
                m for m in members
                if m.isfile()
                and (
                    m.name.split("/")[-1].endswith(SUPPORTED_EXTENSIONS)
                    or m.name.split("/")[-1] == "package.json"   # for workspace map
                )
                and m.size <= MAX_SIZE_BYTES
            ][:MAX_FILES]

            emit(f"Found {len(code_members)} code files — reading...")

            for member in code_members:
                try:
                    f = tar.extractfile(member)
                    if f is None:
                        continue
                    content = f.read().decode("utf-8", errors="replace")
                    # Strip the top-level directory GitHub adds (e.g. "owner-repo-abc123/")
                    parts = member.name.split("/", 1)
                    rel_path = parts[1] if len(parts) > 1 else member.name
                    files.append({
                        "path":     rel_path,
                        "relative": rel_path,
                        "name":     rel_path.split("/")[-1],
                        "content":  content,
                    })
                except Exception:
                    continue
    except Exception as e:
        emit(f"Tarball extraction error: {e}")
        return []

    emit(f"Ready — {len(files)} code files extracted for analysis.")
    return files
