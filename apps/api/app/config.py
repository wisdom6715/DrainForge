import json
import os
from dataclasses import dataclass
from pathlib import Path

_SHARED_CONFIG = json.loads((Path(__file__).parents[3] / "packages" / "config" / "config.json").read_text())


@dataclass(frozen=True)
class ApiConfig:
    supabase_url: str
    service_role_key: str
    cors_origins: list[str]
    notification_from_email: str


def get_config() -> ApiConfig:
    return ApiConfig(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        cors_origins=[value.strip() for value in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if value.strip()],
        notification_from_email=os.getenv("NOTIFICATION_FROM_EMAIL", ""),
        # The shared manifest is loaded at import time so pilot constants stay aligned.
        # Consumers can read `_SHARED_CONFIG["pilotCorridor"]` for corridor metadata.
    )
