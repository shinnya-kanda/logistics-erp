from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict


@dataclass
class FieldArea:
    field_name: str
    page_index: int
    x0: float
    y0: float
    x1: float
    y1: float
    mode: str = "text"
    normalize: str = "raw"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FieldArea":
        return cls(
            field_name=str(data["field_name"]),
            page_index=int(data["page_index"]),
            x0=float(data["x0"]),
            y0=float(data["y0"]),
            x1=float(data["x1"]),
            y1=float(data["y1"]),
            mode=str(data.get("mode", "text")),
            normalize=str(data.get("normalize", "raw")),
        )
