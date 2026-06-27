import httpx

from config import CLOUD_API

_TIMEOUT = 5  # cloud is local — no need for 20s


def check_history(repo: str, token: str = None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        response = httpx.get(
            f"{CLOUD_API}/api/history",
            params={"repo": repo},
            headers=headers,
            timeout=_TIMEOUT,
        )
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return {"history": None}


def save_history(data: dict, token: str = None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        httpx.post(
            f"{CLOUD_API}/api/history",
            json=data,
            headers=headers,
            timeout=_TIMEOUT,
        )
    except Exception:
        pass
