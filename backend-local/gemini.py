import httpx
from openai import OpenAI, RateLimitError, APIError

_active_queue: list[str] = []
_selected: str | None = None


def _client(api_key: str) -> OpenAI:
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        default_headers={"HTTP-Referer": "https://graphlens.app", "X-Title": "GraphLens"},
    )


def _fetch_model_queue(api_key: str) -> list[str]:
    """Query OpenRouter for available models, prefer free ones."""
    try:
        resp = httpx.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        models = resp.json().get("data", [])
        free, paid = [], []
        for m in models:
            mid = m.get("id", "")
            pricing = m.get("pricing", {})
            is_free = str(pricing.get("prompt", "1")) == "0"
            ctx = m.get("context_length", 0)
            if ctx < 4096:
                continue  # too small for our prompts
            if is_free:
                free.append(mid)
            elif any(p in mid for p in ("gemini", "llama", "mistral", "deepseek", "claude")):
                paid.append(mid)
        # prefer instruct/chat models over vision/image ones
        def rank(mid: str) -> int:
            if "free" in mid: return 0
            if "gemini-2" in mid or "gemini-1.5" in mid: return 1
            if "llama" in mid: return 2
            if "mistral" in mid: return 3
            return 10
        queue = sorted(free, key=rank) + sorted(paid, key=rank)
        print(f"[llm] {len(free)} free models, {len(paid)} paid fallbacks. Using: {queue[:3]}", flush=True)
        return queue or ["google/gemini-2.0-flash-001"]
    except Exception as e:
        print(f"[llm] model fetch failed: {e}", flush=True)
        return ["google/gemini-2.0-flash-001", "google/gemini-flash-1.5"]


def _chat(api_key: str, prompt: str, max_tokens: int = 1200) -> str:
    global _selected, _active_queue
    if not _active_queue:
        _active_queue = _fetch_model_queue(api_key)
    if not _selected:
        _selected = _active_queue[0]
        print(f"[llm] selected model: {_selected}", flush=True)
    client = _client(api_key)
    try:
        resp = client.chat.completions.create(
            model=_selected,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content.strip()
    except RateLimitError:
        print(f"[llm] 429 on {_selected}", flush=True)
        if _selected in _active_queue:
            _active_queue.remove(_selected)
        if _active_queue:
            _selected = _active_queue[0]
            print(f"[llm] rotating to {_selected}", flush=True)
            return _chat(api_key, prompt, max_tokens)
        return ""
    except APIError as e:
        print(f"[llm] API error on {_selected}: {str(e)[:120]}", flush=True)
        if _selected in _active_queue:
            _active_queue.remove(_selected)
        if _active_queue:
            _selected = _active_queue[0]
            return _chat(api_key, prompt, max_tokens)
        return ""
    except Exception as e:
        print(f"[llm] error: {str(e)[:120]}", flush=True)
        return ""


def summarize_repo(
    api_key: str,
    language: str,
    total_files: int,
    total_loc: int,
    entry_points: list,
    workspace_map: dict,
) -> str:
    packages_str = "\n".join(
        f"  - {name} → {path}" for name, path in workspace_map.items()
    ) or "  (single package)"

    entry_str = "\n".join(
        f"  - {ep['label']} ({ep['reason']})" for ep in entry_points[:6]
    ) or "  (none detected)"

    prompt = f"""You are helping a new developer understand an unfamiliar {language} codebase.

Stats: {total_files} files, {total_loc:,} lines of code
Packages:
{packages_str}
Key entry points:
{entry_str}

Respond in this exact format:

**What this codebase does**
2-3 sentences on the product/system purpose.

**Architecture**
2-3 sentences on structure — layers, package boundaries, data flow direction.

**Where to start**
Numbered list of 3-5 files or packages to read first, each with one sentence on why."""

    return _chat(api_key, prompt, max_tokens=800)


def explain_file(
    api_key: str,
    label: str,
    content: str,
    imports: list[str],
    imported_by: list[str],
) -> str:
    connections = ""
    if imports:
        connections += f"Imports from: {', '.join(imports)}\n"
    if imported_by:
        connections += f"Used by: {', '.join(imported_by)}\n"

    prompt = f"""Analyze this code file and respond in this exact format (use the headers as written):

**What this file does**
2-3 sentences describing the purpose and responsibility of this file.

**Key functions / classes**
- `name`: one-line description
(list up to 5 most important ones only)

**Role in the codebase**
One sentence on why this file exists and what depends on it.

---
File: {label}
{connections}
```
{content[:6000]}
```"""

    result = _chat(api_key, prompt, max_tokens=600)
    if not result:
        return "GENERATION_FAILED"
    return result
