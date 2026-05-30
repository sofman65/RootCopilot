"""
Global slowapi limiter — lives in its own module so routers can import it
without creating a cycle with app/main.py.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.llm.config import get_settings

settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])
