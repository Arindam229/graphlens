from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import json
from parsers import (
    parse_node,
    parse_python,
    parse_go,
    parse_rust,
)
from detector import detect_dependency_file
from analyzer import analyze_local_repo

app = FastAPI()


# ---------- REQUEST MODEL ----------
class AnalyzeRequest(BaseModel):
    type: str  # "github" or "local"
    url: str | None = None
    path: str | None = None

def extract_dependencies(file_path: str):
    deps = []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Node.js
        if "package.json" in file_path:
            data = json.loads(content)
            deps.extend(list(data.get("dependencies", {}).keys()))

        # Python
        elif "requirements.txt" in file_path:
            for line in content.splitlines():
                if line.strip():
                    deps.append(line.split("==")[0])

    except Exception:
        pass

    return deps

def analyze_local(path: str):
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Invalid path")

    graph = {
        "nodes": [],
        "edges": []
    }

    # scan directory
    for root, dirs, files in os.walk(path):

        for file in files:
            if file.endswith((".json", ".txt", ".toml")):
                file_path = os.path.join(root, file)

                node_id = file_path.replace(path, "")

                graph["nodes"].append({
                    "id": node_id,
                    "label": file,
                    "type": "file"
                })

                # dependency parsing hook (we'll upgrade next step)
                deps = extract_dependencies(file_path)

                for dep in deps:
                    graph["edges"].append({
                        "source": node_id,
                        "target": dep
                    })

    return {
        "status": "success",
        "graph": graph
    }

def analyze_github(url: str):
    # TODO: extract repo info later
    return {
        "status": "success",
        "type": "github",
        "graph": {
            "nodes": [],
            "edges": []
        }
    }

# ---------- HEALTH ----------
@app.get("/")
def root():
    return {"service": "graphlens-local", "status": "running"}


# ---------- ANALYZE ENDPOINT ----------
@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):

    if req.type == "github":
        return analyze_github(req.url)

    elif req.type == "local":
        return analyze_local(req.path)

    else:
        raise HTTPException(status_code=400, detail="Invalid type")