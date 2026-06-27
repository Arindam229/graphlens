import base64
import json
import httpx


def _decode_jwt_payload(token: str) -> dict:
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception as e:
        print(f"[clerk] JWT decode failed: {e}", flush=True)
        return {}


def get_github_oauth_token(clerk_session_token: str, clerk_secret_key: str) -> str | None:
    if not clerk_session_token or not clerk_secret_key:
        print("[clerk] missing token or secret key", flush=True)
        return None

    claims = _decode_jwt_payload(clerk_session_token)
    user_id = claims.get("sub")
    if not user_id:
        print(f"[clerk] no 'sub' in JWT claims: {list(claims.keys())}", flush=True)
        return None

    print(f"[clerk] fetching GitHub token for user_id={user_id}", flush=True)
    try:
        resp = httpx.get(
            f"https://api.clerk.com/v1/users/{user_id}/oauth_access_tokens/oauth_github",
            headers={"Authorization": f"Bearer {clerk_secret_key}"},
            timeout=10,
        )
        print(f"[clerk] Clerk API status={resp.status_code}", flush=True)

        if resp.status_code != 200:
            print(f"[clerk] Clerk API error body: {resp.text[:300]}", flush=True)
            return None

        data = resp.json()
        print(f"[clerk] OAuth response type={type(data).__name__} len={len(data) if isinstance(data, list) else 'n/a'}", flush=True)

        if not isinstance(data, list) or not data:
            print("[clerk] empty or non-list response — user may not have connected GitHub via Clerk OAuth", flush=True)
            return None

        token = data[0].get("token")
        scopes = data[0].get("scopes", [])
        print(f"[clerk] got GitHub token, scopes={scopes}", flush=True)

        if "repo" not in scopes and "public_repo" not in scopes:
            print("[clerk] WARNING: token lacks 'repo' scope — private repos will fail", flush=True)

        return token

    except Exception as e:
        print(f"[clerk] exception: {e}", flush=True)
        return None
