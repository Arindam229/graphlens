import httpx

from config import CLOUD_API


def check_history(repo: str, token: str = None):
    """
    Ask backend-cloud whether this repository
    has already been analyzed.
    """

    headers = {}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = httpx.get(
            f"{CLOUD_API}/api/history",
            params={"repo": repo},
            headers=headers,
            timeout=20,
        )

        if response.status_code == 200:
            return response.json()

    except httpx.HTTPError:
        pass

    return {"history": None}


def save_history(data: dict, token: str = None):
    """
    Save repository analysis to backend-cloud.
    """

    headers = {}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = httpx.post(
            f"{CLOUD_API}/api/history",
            json=data,
            headers=headers,
            timeout=20,
        )

        if response.status_code == 200:
            return response.json()

    except httpx.HTTPError:
        pass

    return None