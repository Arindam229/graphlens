from pydantic import BaseModel
from typing import Dict, List, Any, Optional


class HistoryCreate(BaseModel):
    repo: str
    type: str
    language: str
    graph: Dict
    dep_count: int
    circular_count: int = 0
    entry_points: Optional[List[Dict]] = None
    repo_summary: Optional[str] = None