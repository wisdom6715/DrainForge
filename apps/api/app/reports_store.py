"""Data-access layer for reports — backed by Supabase (same seam already
used in ``app.notifications``: ``configured_supabase_client()``).

Tables (see ``supabase_schema.sql`` for the exact DDL to run once against
your project):
- ``reports``          one row per report
- ``report_evidence``  zero or more photo storage paths per report

Falls back to a small in-memory store (seeded with 3 demo reports) when
``SUPABASE_URL`` / ``SUPABASE_SERVICE_ROLE_KEY`` aren't set, so the API still
runs end-to-end for local development without a live project.
"""

from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from .notifications import configured_supabase_client

EVIDENCE_BUCKET = "report-evidence"

_lock = threading.Lock()
_memory_db: dict[str, dict] = {}
_seeded = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_reference() -> str:
    return f"DF-{uuid4().hex[:10].upper()}"


def _public_url(storage_path: Optional[str]) -> Optional[str]:
    if not storage_path:
        return None
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not supabase_url:
        return None
    return f"{supabase_url}/storage/v1/object/public/{EVIDENCE_BUCKET}/{storage_path}"


def _with_image_url(record: dict) -> dict:
    record = dict(record)
    record.setdefault("image_url", None)
    if not record.get("image_url"):
        record["image_url"] = _public_url(record.get("image_path"))
    return record


def _seed_if_needed() -> None:
    global _seeded
    if _seeded:
        return
    demo = [
        {
            "title": "Herbert Macaulay Culvert",
            "area": "Akoka",
            "category": "blocked_drain",
            "severity": "high",
            "description": "Large amount of plastic waste is blocking the drainage entrance near the culvert.",
            "latitude": 6.5249,
            "longitude": 3.3897,
            "address": "Herbert Macaulay Way, Akoka",
            "image_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80",
            "status": "pending",
        },
        {
            "title": "University Road Channel",
            "area": "UNILAG",
            "category": "rising_water",
            "severity": "medium",
            "description": "Water levels rising steadily along the channel after last night's rain.",
            "latitude": 6.5158,
            "longitude": 3.3966,
            "address": "University Road, UNILAG",
            "image_url": "https://images.unsplash.com/photo-1583912267550-8a5f8375d3a1?w=800&q=80",
            "status": "pending",
        },
        {
            "title": "Oluwalogbon Street",
            "area": "Bariga",
            "category": "waste_plastic",
            "severity": "low",
            "description": "Waste has been cleared and the drain is flowing freely again.",
            "latitude": 6.5296,
            "longitude": 3.3897,
            "address": "Oluwalogbon Street, Bariga",
            "image_url": "https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800&q=80",
            "status": "resolved",
        },
    ]
    for item in demo:
        reference = _make_reference()
        _memory_db[reference] = {
            "id": str(uuid4()),
            "reference": reference,
            "reporter_id": None,
            "image_path": None,
            "location_accuracy": None,
            "created_at": _now(),
            "resolved_at": _now() if item["status"] == "resolved" else None,
            **item,
        }
    _seeded = True


def create_report(payload: dict, evidence_paths: list[str], reporter_id: Optional[str] = None) -> dict:
    reference = _make_reference()
    report_id = str(uuid4())
    image_path = evidence_paths[0] if evidence_paths else None
    row = {
        "id": report_id,
        "reference": reference,
        "reporter_id": reporter_id,
        "status": "pending",
        "created_at": _now(),
        "resolved_at": None,
        "image_path": image_path,
        **payload,
    }

    client = configured_supabase_client()
    if client:
        client.table("reports").insert(row).execute()
        if evidence_paths:
            client.table("report_evidence").insert(
                [{"report_id": report_id, "storage_path": path} for path in evidence_paths]
            ).execute()
        return _with_image_url(row)

    with _lock:
        _seed_if_needed()
        _memory_db[reference] = row
    return _with_image_url(row)


def list_reports(status: Optional[str] = None, limit: int = 50) -> list[dict]:
    client = configured_supabase_client()
    if client:
        query = client.table("reports").select("*").order("created_at", desc=True).limit(limit)
        if status:
            query = query.eq("status", status)
        result = query.execute()
        return [_with_image_url(row) for row in (result.data or [])]

    with _lock:
        _seed_if_needed()
        items = list(_memory_db.values())
    if status:
        items = [item for item in items if item["status"] == status]
    items.sort(key=lambda item: item["created_at"], reverse=True)
    return [_with_image_url(item) for item in items[:limit]]


def search_reports(query: str, limit: int = 20) -> list[dict]:
    needle = query.strip()
    if not needle:
        return []

    client = configured_supabase_client()
    if client:
        result = (
            client.table("reports")
            .select("*")
            .or_(f"title.ilike.%{needle}%,reference.ilike.%{needle}%")
            .limit(limit)
            .execute()
        )
        return [_with_image_url(row) for row in (result.data or [])]

    with _lock:
        _seed_if_needed()
        items = list(_memory_db.values())
    lowered = needle.lower()
    matched = [item for item in items if lowered in item["title"].lower() or lowered in item["reference"].lower()]
    matched.sort(key=lambda item: item["created_at"], reverse=True)
    return [_with_image_url(item) for item in matched[:limit]]


def get_report(reference: str) -> Optional[dict]:
    reference = reference.strip().upper()
    client = configured_supabase_client()
    if client:
        result = client.table("reports").select("*").eq("reference", reference).limit(1).execute()
        rows = result.data or []
        return _with_image_url(rows[0]) if rows else None

    with _lock:
        _seed_if_needed()
        record = _memory_db.get(reference)
    return _with_image_url(record) if record else None


def update_status(reference: str, new_status: str) -> Optional[dict]:
    reference = reference.strip().upper()
    updates = {"status": new_status, "resolved_at": _now() if new_status == "resolved" else None}

    client = configured_supabase_client()
    if client:
        existing = client.table("reports").select("*").eq("reference", reference).limit(1).execute()
        if not (existing.data or []):
            return None
        client.table("reports").update(updates).eq("reference", reference).execute()
        refreshed = client.table("reports").select("*").eq("reference", reference).limit(1).execute()
        rows = refreshed.data or []
        return _with_image_url(rows[0]) if rows else None

    with _lock:
        _seed_if_needed()
        record = _memory_db.get(reference)
        if not record:
            return None
        record.update(updates)
    return _with_image_url(record)


def analytics() -> dict:
    items = list_reports(limit=10_000)
    total = len(items)
    resolved = sum(1 for item in items if item["status"] == "resolved")
    pending = total - resolved

    now = datetime.now(timezone.utc)
    months: list[tuple[str, int]] = []
    for offset in range(5, -1, -1):
        month_index = (now.month - 1 - offset) % 12 + 1
        year = now.year + ((now.month - 1 - offset) // 12)
        months.append((f"{year}-{month_index:02d}", 0))
    month_counts = dict(months)
    this_month_key = f"{now.year}-{now.month:02d}"
    this_month_count = 0

    for item in items:
        key = (item.get("created_at") or "")[:7]
        if key in month_counts:
            month_counts[key] += 1
        if key == this_month_key:
            this_month_count += 1

    month_labels = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
        "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    }
    monthly_series = [{"month": month_labels[key.split("-")[1]], "count": count} for key, count in month_counts.items()]

    return {
        "total_reports": total,
        "resolved": resolved,
        "pending": pending,
        "reports_this_month": this_month_count,
        "resolution_rate": round((resolved / total) * 100) if total else 0,
        "monthly": monthly_series,
    }
