from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import asyncio
import json

from analyzer import (
    analyze_local_repo,
    analyze_github_repo,
)

from cloud import (
    check_history,
    save_history,
)

from config import CLOUD_API, OPENROUTER_API_KEY, GEMINI_API_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
from gemini import explain_file

LLM_API_KEY = OPENROUTER_API_KEY or GEMINI_API_KEY

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "tauri://localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- REQUEST MODEL ----------
class AnalyzeRequest(BaseModel):
    type: str              # "github" or "local"
    url: str | None = None
    path: str | None = None
    token: str | None = None         # Clerk JWT — for cloud auth only
    github_token: str | None = None  # GitHub PAT — for private repos / higher rate limits


# ---------- HEALTH ----------
@app.get("/")
def root():
    return {
        "service": "graphlens-local",
        "status": "running"
    }


import time as _time

# ---------- ANALYZE ----------
@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    t0 = _time.time()
    print(f"[analyze] START type={req.type} repo={req.url or req.path}", flush=True)

    if req.type == "github":
        if not req.url:
            raise HTTPException(status_code=400, detail="GitHub URL is required.")
        repo = req.url
    elif req.type == "local":
        if not req.path:
            raise HTTPException(status_code=400, detail="Local path is required.")
        repo = req.path
    else:
        raise HTTPException(status_code=400, detail="Invalid analysis type.")

    # Step 1: Check cache in cloud
    print(f"[analyze] step1 check_history ...", flush=True)
    cached = check_history(repo, req.token)
    print(f"[analyze] step1 done ({_time.time()-t0:.1f}s)", flush=True)

    if cached.get("history") is not None:
        print(f"[analyze] cache hit, returning", flush=True)
        return {
            "status": "success",
            "cached": True,
            "graph": cached["history"]["graph"],
            "meta": cached["history"]["meta"],
            "cycles": [],
        }

    # Step 2: Analyze repository
    if req.type == "github":
        # token IS the GitHub OAuth token (set as both token and github_token from frontend)
        gh_token = req.github_token or req.token
        print(f"[analyze] step2 analyze_github_repo token={'set' if gh_token else 'NONE'} ...", flush=True)
        result = analyze_github_repo(req.url, gh_token)
    else:
        print(f"[analyze] step2 analyze_local_repo ...", flush=True)
        result = analyze_local_repo(req.path)

    print(f"[analyze] step2 done ({_time.time()-t0:.1f}s) status={result.get('status')}", flush=True)

    if result["status"] != "success":
        return result

    # Step 3: Save to cloud
    print(f"[analyze] step3 save_history ...", flush=True)
    save_history(
        {
            "repo": repo,
            "type": req.type,
            "language": result["meta"].get("language", "unknown"),
            "graph": result["graph"],
            "dep_count": result["meta"].get("total_files", 0),
            "circular_count": result["meta"].get("cycles_found", len(result.get("cycles", []))),
            "entry_points": result["meta"].get("entry_points", []),
            "repo_summary": result["meta"].get("repo_summary", ""),
        },
        req.token,
    )
    print(f"[analyze] step3 done ({_time.time()-t0:.1f}s)", flush=True)

    print(f"[analyze] DONE total={_time.time()-t0:.1f}s nodes={len(result['graph']['nodes'])} edges={len(result['graph']['edges'])}", flush=True)
    return result


# ---------- ANALYZE STREAM (SSE) ----------
@app.post("/api/analyze/stream")
async def analyze_stream(req: AnalyzeRequest):
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def emit(msg: str):
        loop.call_soon_threadsafe(queue.put_nowait, json.dumps({"step": msg}))

    def emit_done(result: dict):
        loop.call_soon_threadsafe(queue.put_nowait, json.dumps({"done": True, "result": result}))

    def emit_error(msg: str):
        loop.call_soon_threadsafe(queue.put_nowait, json.dumps({"error": msg}))

    async def run():
        try:
            if req.type == "github":
                if not req.url:
                    emit_error("GitHub URL is required."); return
                repo = req.url
            elif req.type == "local":
                if not req.path:
                    emit_error("Local path is required."); return
                repo = req.path
            else:
                emit_error("Invalid type."); return

            emit("Checking analysis cache...")
            cached = await loop.run_in_executor(None, lambda: check_history(repo, req.token))

            if cached.get("history") is not None:
                emit("Cache hit — loading from cloud...")
                emit_done({
                    "status": "success", "cached": True,
                    "graph": cached["history"]["graph"],
                    "meta":  cached["history"]["meta"],
                    "cycles": [],
                })
                return

            if req.type == "github":
                gh_token = req.github_token or req.token
                emit("Authenticating with GitHub...")

                def _github():
                    from analyzer import analyze_github_repo
                    return analyze_github_repo(req.url, gh_token, progress_cb=emit)

                result = await loop.run_in_executor(None, _github)
            else:
                emit("Scanning local file system...")

                def _local():
                    from analyzer import analyze_local_repo
                    return analyze_local_repo(req.path)

                result = await loop.run_in_executor(None, _local)

            if result["status"] != "success":
                emit_error(result.get("message") or result.get("code") or "Analysis failed.")
                return

            emit(f"Graph built — {len(result['graph']['nodes'])} modules, {len(result['graph']['edges'])} edges.")
            emit("Saving to cloud...")

            def _save():
                save_history({
                    "repo": repo, "type": req.type,
                    "language": result["meta"].get("language", "unknown"),
                    "graph": result["graph"],
                    "dep_count": result["meta"].get("total_files", 0),
                    "circular_count": result["meta"].get("cycles_found", len(result.get("cycles", []))),
                    "entry_points": result["meta"].get("entry_points", []),
                    "repo_summary": result["meta"].get("repo_summary", ""),
                }, req.token)

            await loop.run_in_executor(None, _save)
            emit("Done!")
            emit_done(result)

        except Exception as e:
            emit_error(str(e))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    asyncio.create_task(run())

    async def event_gen():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {item}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------- HISTORY PROXY ----------
@app.get("/api/history/all")
def get_history_all(request: Request, page: int = 1, limit: int = 20):
    auth = request.headers.get("Authorization")
    headers = {"Authorization": auth} if auth else {}
    try:
        response = httpx.get(
            f"{CLOUD_API}/api/history/all",
            params={"page": page, "limit": limit},
            headers=headers,
            timeout=20,
        )
        return response.json()
    except Exception as e:
        print(f"[history/all] proxy error: {e}", flush=True)
        return {"items": [], "total": 0, "page": page, "pages": 0}


@app.get("/api/history")
def get_history_single(request: Request, repo: str):
    auth = request.headers.get("Authorization")
    headers = {"Authorization": auth} if auth else {}
    try:
        response = httpx.get(
            f"{CLOUD_API}/api/history",
            params={"repo": repo},
            headers=headers,
            timeout=20,
        )
        return response.json()
    except Exception as e:
        print(f"[history] proxy error: {e}", flush=True)
        return {"history": None}


@app.delete("/api/history/all")
def delete_history_all(request: Request):
    auth = request.headers.get("Authorization")
    headers = {"Authorization": auth} if auth else {}
    try:
        response = httpx.delete(
            f"{CLOUD_API}/api/history/all",
            headers=headers,
            timeout=20,
        )
        return response.json()
    except Exception as e:
        print(f"[history/delete] proxy error: {e}", flush=True)
        return {"status": "error", "message": str(e)}


# ---------- EXPLAIN ----------
_explain_cache: dict[str, str] = {}  # "{repo}::{file_id}" → explanation

class ExplainRequest(BaseModel):
    type: str                       # "local" | "github"
    file_id: str                    # normalized forward-slash relative path
    label: str                      # filename
    imports: list[str] = []         # filenames this node imports
    imported_by: list[str] = []     # filenames that import this node
    path: str | None = None         # local repo root
    url: str | None = None          # github repo url
    token: str | None = None        # clerk jwt (for github oauth lookup)


@app.post("/api/explain")
def explain(req: ExplainRequest):
    if not LLM_API_KEY:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured.")

    cache_key = f"{req.url or req.path}::{req.file_id}"
    if cache_key in _explain_cache:
        return {"explanation": _explain_cache[cache_key]}

    # Fetch file content
    content = ""

    if req.type == "local" and req.path:
        try:
            file_path = req.path.rstrip("/\\") + "/" + req.file_id.replace("/", __import__("os").sep)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Could not read file: {e}")

    elif req.type == "github" and req.url:
        try:
            from github import parse_github_url
            owner, repo = parse_github_url(req.url)
            gh_token = req.token  # already a GitHub OAuth token
            headers = {"Authorization": f"Bearer {gh_token}"} if gh_token else {}
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{req.file_id}"
            resp = httpx.get(raw_url, headers=headers, timeout=15)
            if resp.status_code == 200:
                content = resp.text
            else:
                raise HTTPException(status_code=404, detail="File not found on GitHub.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    else:
        raise HTTPException(status_code=400, detail="Provide path (local) or url (github).")

    result = explain_file(
        api_key=LLM_API_KEY,
        label=req.label,
        content=content,
        imports=req.imports,
        imported_by=req.imported_by,
    )
    if result not in ("BLOCKED", "QUOTA_EXCEEDED", "INVALID_KEY", "GENERATION_FAILED"):
        _explain_cache[cache_key] = result
    return {"explanation": result}


# ---------- GITHUB OAUTH CALLBACK ----------
@app.get("/auth/github/callback")
def github_oauth_callback(code: str):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set in backend-local/.env")
    try:
        resp = httpx.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": code},
            timeout=15,
        )
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise HTTPException(status_code=400, detail=f"GitHub token exchange failed: {data}")
        return {"token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
