# GraphLens Backend Spec

**Stack:** FastAPI · Neon (PostgreSQL) · Clerk JWT auth

---

## Auth Pattern

Every request carries a Clerk JWT as `Authorization: Bearer <token>`.

Current stub in `main.py` → replace with real JWKS verification:

```python
import httpx
from jose import jwt

CLERK_JWKS_URL = "https://<your-clerk-domain>/.well-known/jwks.json"

def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    jwks = httpx.get(CLERK_JWKS_URL).json()
    payload = jwt.decode(token, jwks, algorithms=["RS256"])
    return {"user_id": payload["sub"]}
```

To get the user's **GitHub OAuth access token** (needed for private repo access):

```python
import httpx

def get_github_token(clerk_user_id: str, clerk_secret: str) -> str:
    res = httpx.get(
        f"https://api.clerk.com/v1/users/{clerk_user_id}/oauth_access_tokens/oauth_github",
        headers={"Authorization": f"Bearer {clerk_secret}"}
    )
    return res.json()[0]["token"]
```

---

## New Endpoint Required

### `POST /api/analyze`

**Request body** (sent from frontend):

```json
// GitHub URL
{
  "type": "github",
  "url": "https://github.com/owner/repo",
  "token": "<clerk_jwt>"
}

// Local path
{
  "type": "local",
  "path": "/absolute/path/to/repo",
  "token": "<clerk_jwt>"
}
```

**Response:**

```json
{
  "status": "success",
  "graph": {
    "nodes": [
      { "id": "package.json", "label": "package.json", "type": "root" },
      { "id": "express",      "label": "express",       "type": "dep",  "version": "^4.18.0" },
      { "id": "lodash",       "label": "lodash",        "type": "dep",  "version": "^4.17.21" }
    ],
    "edges": [
      { "source": "package.json", "target": "express" },
      { "source": "package.json", "target": "lodash" }
    ]
  },
  "meta": {
    "repo": "https://github.com/owner/repo",
    "language": "node",
    "dep_count": 12,
    "circular_count": 0,
    "analyzed_at": "2026-06-25T12:00:00Z"
  }
}
```

---

## GitHub Flow (type = "github")

1. Verify Clerk JWT → get `user_id`
2. Call Clerk API → get user's GitHub OAuth token (see above)
3. Parse GitHub URL → extract `owner` and `repo`
4. Fetch dep file from GitHub Contents API:

```python
CONTENTS_URL = "https://api.github.com/repos/{owner}/{repo}/contents/{path}"

headers = {
    "Authorization": f"Bearer {github_token}",
    "Accept": "application/vnd.github.v3.raw"
}
```

5. Detect language by which file exists (check in order):

| File | Language |
|------|----------|
| `package.json` | Node.js |
| `requirements.txt` or `pyproject.toml` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |

6. Parse the file → build `nodes` + `edges`
7. Save result to Neon DB (see History schema below)
8. Return graph JSON

**v1 scope:** direct deps only. No transitive resolution.

---

## Local Path Flow (type = "local")

1. Verify Clerk JWT
2. Read file from `path` on the server filesystem
3. Same language detection + parsing as GitHub flow
4. Same response format

> Note: server must have filesystem access to the path. Only works if user runs the backend locally.

---

## Language Parsers

### Node.js — `package.json`

```python
import json, base64

def parse_node(content: str) -> dict:
    pkg = json.loads(content)
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    nodes = [{"id": "package.json", "label": pkg.get("name", "root"), "type": "root"}]
    edges = []
    for name, version in deps.items():
        nodes.append({"id": name, "label": name, "type": "dep", "version": version})
        edges.append({"source": "package.json", "target": name})
    return {"nodes": nodes, "edges": edges}
```

### Python — `requirements.txt`

```python
def parse_python(content: str) -> dict:
    lines = [l.strip() for l in content.splitlines() if l.strip() and not l.startswith("#")]
    nodes = [{"id": "requirements.txt", "label": "requirements.txt", "type": "root"}]
    edges = []
    for line in lines:
        name = line.split("==")[0].split(">=")[0].split("~=")[0].strip()
        version = line[len(name):].strip() or "*"
        nodes.append({"id": name, "label": name, "type": "dep", "version": version})
        edges.append({"source": "requirements.txt", "target": name})
    return {"nodes": nodes, "edges": edges}
```

### Go — `go.mod`

```python
import re

def parse_go(content: str) -> dict:
    requires = re.findall(r'^\s+(\S+)\s+(\S+)', content, re.MULTILINE)
    nodes = [{"id": "go.mod", "label": "go.mod", "type": "root"}]
    edges = []
    for mod, version in requires:
        nodes.append({"id": mod, "label": mod, "type": "dep", "version": version})
        edges.append({"source": "go.mod", "target": mod})
    return {"nodes": nodes, "edges": edges}
```

### Rust — `Cargo.toml`

```python
import tomllib  # Python 3.11+

def parse_rust(content: str) -> dict:
    cargo = tomllib.loads(content)
    deps = cargo.get("dependencies", {})
    nodes = [{"id": "Cargo.toml", "label": cargo.get("package", {}).get("name", "root"), "type": "root"}]
    edges = []
    for name, val in deps.items():
        version = val if isinstance(val, str) else val.get("version", "*")
        nodes.append({"id": name, "label": name, "type": "dep", "version": version})
        edges.append({"source": "Cargo.toml", "target": name})
    return {"nodes": nodes, "edges": edges}
```

---

## History Schema (Neon)

```sql
CREATE TABLE analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  repo        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('github', 'local')),
  language    TEXT NOT NULL,
  graph       JSONB NOT NULL,
  dep_count   INT,
  circular_count INT DEFAULT 0,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON analyses (user_id, analyzed_at DESC);
```

Save after every successful analysis. `GET /api/history` already stubbed — query by `user_id` from JWT.

---

## Error Responses

```json
{ "status": "error", "code": "REPO_NOT_FOUND",    "message": "GitHub repo does not exist or is not accessible" }
{ "status": "error", "code": "NO_DEP_FILE",       "message": "No supported dependency file found in repo root" }
{ "status": "error", "code": "PARSE_FAILED",      "message": "Failed to parse dependency file" }
{ "status": "error", "code": "GITHUB_RATE_LIMIT", "message": "GitHub API rate limit exceeded" }
{ "status": "error", "code": "UNAUTHORIZED",      "message": "Invalid or expired token" }
```

---

## ENV vars needed

```
DATABASE_URL=postgresql://...          # already in .env.example
CLERK_SECRET_KEY=sk_test_...           # already in .env.example
CLERK_JWKS_URL=https://<domain>/.well-known/jwks.json
```

Clerk domain found in Clerk Dashboard → API Keys → Frontend API URL.
