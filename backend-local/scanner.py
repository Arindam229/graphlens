import os
from ignore import IGNORE_DIRS, IGNORE_FILES

SUPPORTED_EXTENSIONS = (
    ".ts", ".js", ".tsx", ".jsx",
    ".py",
    ".go",
    ".rs",
)

MAX_FILE_SIZE_BYTES = 512 * 1024  # skip files > 512 KB


def scan_repo(repo_path: str):
    files = []

    for root, dirs, filenames in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in filenames:
            if file in IGNORE_FILES:
                continue
            if not file.endswith(SUPPORTED_EXTENSIONS):
                continue

            full_path = os.path.join(root, file)

            try:
                if os.path.getsize(full_path) > MAX_FILE_SIZE_BYTES:
                    continue
            except OSError:
                continue

            rel_path = os.path.relpath(full_path, repo_path)

            files.append({
                "path": full_path,
                "relative": rel_path,
                "name": file,
            })

    return files
