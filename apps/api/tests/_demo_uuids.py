"""
Deterministic UUIDs for seeded demo data.

Tests use these instead of hardcoded legacy strings since the DB stores UUIDs
derived via uuid_for(legacy_id) at seed time.
"""

from app.scripts.seed_demo_data import uuid_for

WS_DEMO = str(uuid_for("ws_demo"))
INT_MANUAL = str(uuid_for("int_manual"))

PROJECT_PAYMENTS = str(uuid_for("project_payments"))
PROJECT_CHECKOUT = str(uuid_for("project_checkout"))

TICKET_MERCHANT_CONFIG = str(uuid_for("ticket_merchant_config"))
TICKET_REFUND_TIMEOUT = str(uuid_for("ticket_refund_timeout"))
TICKET_BATCH_DATE = str(uuid_for("ticket_batch_date"))
