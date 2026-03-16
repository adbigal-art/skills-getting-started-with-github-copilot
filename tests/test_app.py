import copy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module
from src.app import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities = copy.deepcopy(original)


def test_get_activities_returns_all_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "Soccer Team" in data
    assert data["Chess Club"]["description"].startswith("Learn strategies")


def test_signup_adds_participant_and_prevents_duplicates():
    email = "testuser@mergington.edu"
    activity = "Chess Club"

    # Initial signup succeeds
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for {activity}"

    # Participant now present in activity
    activities = client.get("/activities").json()
    assert email in activities[activity]["participants"]

    # Duplicate signup should fail
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up for this activity"


def test_remove_participant_works():
    activity = "Programming Class"
    email = "emma@mergington.edu"

    # Ensure participant exists before removal
    activities_before = client.get("/activities").json()
    assert email in activities_before[activity]["participants"]

    response = client.delete(f"/activities/{activity}/participants?email={email}")
    assert response.status_code == 200
    assert response.json()["message"] == f"Removed {email} from {activity}"

    activities_after = client.get("/activities").json()
    assert email not in activities_after[activity]["participants"]


def test_remove_nonexistent_participant_returns_404():
    response = client.delete("/activities/Chess Club/participants?email=nonexistent@mergington.edu")
    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found in this activity"
