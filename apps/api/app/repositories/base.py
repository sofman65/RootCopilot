"""
Repository base class.
"""

from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    """All repositories hold a reference to the active session."""

    def __init__(self, session: AsyncSession):
        self.session = session
