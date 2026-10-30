def test_create_and_list_projects(client, auth_headers):
    # Create project
    create_res = client.post(
        "/projects",
        json={"name": "Defense Drone Vision", "description": "Edge AI tracking on UAV"},
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]
    assert create_res.json()["name"] == "Defense Drone Vision"

    # List projects
    list_res = client.get("/projects", headers=auth_headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) == 1
    assert projects[0]["id"] == proj_id

    # Get single project
    get_res = client.get(f"/projects/{proj_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Defense Drone Vision"


def test_update_and_delete_project(client, auth_headers):
    create_res = client.post(
        "/projects",
        json={"name": "Initial Name", "description": "Initial Desc"},
        headers=auth_headers,
    )
    proj_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/projects/{proj_id}",
        json={"name": "Updated Name", "description": "Updated Desc"},
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Name"

    # Delete
    del_res = client.delete(f"/projects/{proj_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Verify deleted
    get_res = client.get(f"/projects/{proj_id}", headers=auth_headers)
    assert get_res.status_code == 404

