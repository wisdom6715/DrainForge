from dataclasses import dataclass
from enum import StrEnum
import os
from typing import Protocol


class NotificationEvent(StrEnum):
    REPORT_CREATED = "report_created"
    REPORT_VERIFIED = "report_verified"
    REPORT_RESOLVED = "report_resolved"


@dataclass(frozen=True)
class NotificationMessage:
    event: NotificationEvent
    subject: str
    body: str
    report_reference: str


class NotificationSink(Protocol):
    def send(self, message: NotificationMessage, recipient_ids: list[str]) -> None: ...


def configured_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


class InAppNotificationSink:
    """Production adapter seam: persist messages to Supabase notifications rows."""

    def __init__(self, supabase_client=None):
        self.supabase_client = supabase_client

    def send(self, message: NotificationMessage, recipient_ids: list[str]) -> None:
        if not self.supabase_client or not recipient_ids:
            return
        rows = [
            {
                "recipient_id": recipient_id,
                "subject": message.subject,
                "body": message.body,
                "channel": "in_app",
            }
            for recipient_id in recipient_ids
        ]
        self.supabase_client.table("notifications").insert(rows).execute()


def notification_for(event: NotificationEvent, reference: str, status_label: str | None = None) -> NotificationMessage:
    if event is NotificationEvent.REPORT_CREATED:
        return NotificationMessage(event, f"Report {reference} received", "Thank you. Your report is now with the response team.", reference)
    if event is NotificationEvent.REPORT_VERIFIED:
        return NotificationMessage(event, f"Report {reference} verified", "Your report has been verified and is being prepared for action.", reference)
    return NotificationMessage(event, f"Report {reference} resolved", "The response team marked your report resolved. Thank you for helping your community.", reference)
