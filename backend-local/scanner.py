import os
from ignore import IGNORE_DIRS, IGNORE_FILES


def scan_repo(repo_path: str):
    files = []

    for root, dirs, filenames in os.walk(repo_path):

        # 🚫 prune ignored dirs in-place (important for speed)
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in filenames:

            if file in IGNORE_FILES:
                continue

            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, repo_path)

            files.append({
                "path": full_path,
                "relative": rel_path,
                "name": file
            })

    return files