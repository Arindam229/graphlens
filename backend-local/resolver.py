import os


def resolve_import(import_path: str, current_file: str, all_files: list):

    # Normalize relative imports
    if import_path.startswith("."):

        base_dir = os.path.dirname(current_file)
        candidate = os.path.normpath(os.path.join(base_dir, import_path))

        for f in all_files:
            if f["relative"].startswith(candidate):
                return f["relative"]

    # fallback: naive match by filename
    for f in all_files:
        if import_path in f["relative"]:
            return f["relative"]

    return None