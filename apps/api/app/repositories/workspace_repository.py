"""WorkspaceRepository — top-level workspace + tree-builder query."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Workspace, Project, Ticket
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository):
    async def get_by_id(self, workspace_id: UUID) -> Optional[Workspace]:
        return await self.session.get(Workspace, workspace_id)

    async def get_current(self) -> Optional[Workspace]:
        """MVP: single-workspace deployment, return the first row."""
        r = await self.session.execute(select(Workspace).limit(1))
        return r.scalar_one_or_none()

    async def get_tree(self, workspace_id: UUID) -> dict:
        """
        Build the workspace tree (Client → Project → Environment → Ticket)
        from ticket metadata. Mirrors the existing /workspace/tree endpoint.
        """
        # Fetch projects + tickets in one round-trip via selectinload
        projects_r = await self.session.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id)
        )
        projects = {p.id: p for p in projects_r.scalars().all()}

        tickets_r = await self.session.execute(
            select(Ticket).where(Ticket.workspace_id == workspace_id)
        )
        tickets = list(tickets_r.scalars().all())

        # Group: client_name → project_id → environment → tickets
        tree: dict = {}
        for t in tickets:
            client_name = t.client_name or "Unknown"
            client_id = "client_" + client_name.lower().replace(" ", "_")
            project = projects.get(t.project_id)
            project_id = str(t.project_id)
            project_name = project.name if project else "Unknown"
            env_name = t.environment or "Unknown"
            env_id = f"env_{project_id}_{env_name.lower()}"

            if client_id not in tree:
                tree[client_id] = {"id": client_id, "name": client_name, "projects": {}}
            if project_id not in tree[client_id]["projects"]:
                tree[client_id]["projects"][project_id] = {
                    "id": project_id,
                    "name": project_name,
                    "environments": {},
                }
            envs = tree[client_id]["projects"][project_id]["environments"]
            if env_id not in envs:
                envs[env_id] = {"id": env_id, "name": env_name, "tickets": []}

            envs[env_id]["tickets"].append({
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "source_system": t.source_system,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            })

        clients = []
        for client_node in tree.values():
            projs = []
            for project_node in client_node["projects"].values():
                projs.append({
                    "id": project_node["id"],
                    "name": project_node["name"],
                    "environments": list(project_node["environments"].values()),
                })
            clients.append({
                "id": client_node["id"],
                "name": client_node["name"],
                "projects": projs,
            })

        return {"clients": clients}
