from fastapi import APIRouter

from app.schemas import WorkspaceResponse
from app.demo_data import WORKSPACE, PROJECTS, TICKETS

router = APIRouter()


@router.get("/workspace/current", response_model=WorkspaceResponse)
def workspace_current():
    return WORKSPACE


@router.get("/workspace/tree")
def workspace_tree():
    project_map = {p["id"]: p for p in PROJECTS}
    tree: dict = {}

    for t in TICKETS:
        client_name = t.get("client_name") or "Unknown"
        client_id = "client_" + client_name.lower().replace(" ", "_")
        project = project_map.get(t["project_id"], {})
        project_id = t["project_id"]
        project_name = project.get("name", "Unknown")
        env_name = t.get("environment") or "Unknown"
        env_id = f"env_{project_id}_{env_name.lower()}"

        if client_id not in tree:
            tree[client_id] = {"id": client_id, "name": client_name, "projects": {}}
        if project_id not in tree[client_id]["projects"]:
            tree[client_id]["projects"][project_id] = {
                "id": project_id,
                "name": project_name,
                "environments": {},
            }
        if env_id not in tree[client_id]["projects"][project_id]["environments"]:
            tree[client_id]["projects"][project_id]["environments"][env_id] = {
                "id": env_id,
                "name": env_name,
                "tickets": [],
            }

        tree[client_id]["projects"][project_id]["environments"][env_id]["tickets"].append({
            "id": t["id"],
            "title": t["title"],
            "status": t["status"],
            "priority": t["priority"],
            "source_system": t["source_system"],
            "created_at": t["created_at"],
            "updated_at": t["updated_at"],
        })

    clients = []
    for client_node in tree.values():
        projects = []
        for project_node in client_node["projects"].values():
            envs = list(project_node["environments"].values())
            projects.append({
                "id": project_node["id"],
                "name": project_node["name"],
                "environments": envs,
            })
        clients.append({"id": client_node["id"], "name": client_node["name"], "projects": projects})

    return {"clients": clients}
