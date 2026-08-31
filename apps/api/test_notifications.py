from app.notifications import NotificationEvent, notification_for


def test_report_created_acknowledgement():
    message = notification_for(NotificationEvent.REPORT_CREATED, "DF-2026-000421")
    assert message.report_reference == "DF-2026-000421"
    assert "received" in message.subject.lower()


def test_status_alerts_are_distinct():
    verified = notification_for(NotificationEvent.REPORT_VERIFIED, "DF-2026-000421")
    resolved = notification_for(NotificationEvent.REPORT_RESOLVED, "DF-2026-000421")
    assert verified.subject != resolved.subject
    assert "verified" in verified.subject.lower()
    assert "resolved" in resolved.subject.lower()
