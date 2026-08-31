from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

import os

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .notifications import InAppNotificationSink, NotificationEvent, configured_supabase_client, notification_for

app = FastAPI(title="DrainForge API", version="0.1.0", description="Resident and authority drainage reporting service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-User-Role"],
)


class ReportCategory(str, Enum):
    BLOCKED_DRAIN = "blocked_drain"
    FLOODING = "flooding"
    WASTE_PLASTIC = "waste_plastic"
    RISING_WATER = "rising_water"
    DAMAGED_DRAINAGE = "damaged_drainage"
    OTHER = "other"


class ReportSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReportStatus(str, Enum):
    RECEIVED = "received"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    DUPLICATE = "duplicate"


class ReportCreate(BaseModel):
    category: ReportCategory
    severity: ReportSeverity = ReportSeverity.MEDIUM
    description: str = Field(default="", max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: Optional[str] = Field(default=None, max_length=300)
    location_accuracy: Optional[float] = Field(default=None, ge=0)
    evidence_paths: list[str] = Field(default_factory=list, max_length=3)


class ReportResponse(ReportCreate):
    id: UUID
    reference: str
    status: ReportStatus


class StatusUpdate(BaseModel):
    status: ReportStatus
    note: Optional[str] = Field(default=None, max_length=500)
    assigned_team_id: Optional[UUID] = None


class RequestActor(BaseModel):
    user_id: Optional[str] = None
    role: str = "resident"


bearer = HTTPBearer(auto_error=False)


def actor_from_headers(x_user_role: Optional[str] = Header(default=None), credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> RequestActor:
    if credentials:
        client = configured_supabase_client()
        if client:
            try:
                user = client.auth.get_user(credentials.credentials).user
                metadata = user.app_metadata or {}
                return RequestActor(user_id=str(user.id), role=str(metadata.get("role", "resident")))
            except Exception as error:
                raise HTTPException(status_code=401, detail="Invalid Supabase session") from error
    return RequestActor(role=x_user_role or "resident")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "drainforge-api"}


@app.post("/api/v1/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, actor: RequestActor = Depends(actor_from_headers)) -> ReportResponse:
    report_id = uuid4()
    reference = f"DF-{report_id.hex[:10].upper()}"
    response = ReportResponse(id=report_id, reference=reference, status=ReportStatus.RECEIVED, **payload.model_dump())
    client = configured_supabase_client()
    if client:
        row = {"id": str(report_id), "reference": reference, "reporter_id": actor.user_id, **payload.model_dump(exclude={"evidence_paths"})}
        client.table("reports").insert(row).execute()
        if payload.evidence_paths:
            client.table("report_evidence").insert([{"report_id": str(report_id), "storage_path": path} for path in payload.evidence_paths]).execute()
    InAppNotificationSink(client).send(notification_for(NotificationEvent.REPORT_CREATED, reference), [actor.user_id] if actor.user_id else [])
    return response


@app.get("/api/v1/reports")
def list_reports(status_filter: Optional[ReportStatus] = None, actor: RequestActor = Depends(actor_from_headers)) -> dict[str, object]:
    return {"items": [], "status_filter": status_filter, "viewer_role": actor.role}


@app.patch("/api/v1/reports/{report_id}/status", response_model=StatusUpdate)
def update_report_status(report_id: UUID, payload: StatusUpdate, actor: RequestActor = Depends(actor_from_headers)) -> StatusUpdate:
    if actor.role not in {"authority", "admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Authority role required")
    InAppNotificationSink(configured_supabase_client()).send(notification_for(NotificationEvent.REPORT_VERIFIED if payload.status is ReportStatus.VERIFIED else NotificationEvent.REPORT_RESOLVED if payload.status is ReportStatus.RESOLVED else NotificationEvent.REPORT_CREATED, report_id.hex[:10].upper()), [actor.user_id] if actor.user_id else [])
    return payload
