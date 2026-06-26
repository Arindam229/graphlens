import os


SUPPORTED_FILES = {
    "package.json": "node",
    "requirements.txt": "python",
    "pyproject.toml": "python",
    "go.mod": "go",
    "Cargo.toml": "rust",
}


def detect_dependency_file(repo_path: str):
    """
    Looks for a supported dependency file
    in the repository root.
    """

    for filename, language in SUPPORTED_FILES.items():

        full_path = os.path.join(repo_path, filename)

        if os.path.isfile(full_path):
            return {
                "language": language,
                "file": filename,
                "path": full_path
            }

    return None