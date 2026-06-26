def count_loc(file_path: str):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return sum(
                1 for line in f
                if line.strip()
            )
    except Exception:
        return 0