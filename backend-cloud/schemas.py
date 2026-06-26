from pydantic import BaseModel
from typing import Dict, Any


class HistoryCreate(BaseModel):
    repo: str
    type: str
    language: str
    graph: Dict
    dep_count: int
    circular_count: int = 0