"""Exercise the complete account API with the frontend's actual demo catalogue."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    from src.database import connection
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setattr(connection, 'DATABASE_PATH', str(tmp_path / 'accounts.db'))
    from src.api.main import app
    with TestClient(app) as client:
        yield client


def register(client, email):
    response = client.post('/api/auth/register', json={'name': 'Backend Test', 'email': email, 'password': 'ValidTestPass123!'})
    assert response.status_code == 200, response.text
    return response.json()['token']


def test_signup_login_profile_and_correct_saved_product(client):
    token = register(client, 'one@example.invalid')
    headers = {'Authorization': 'Bearer ' + token}
    assert client.post('/api/auth/register', json={'name': 'Duplicate', 'email': 'one@example.invalid', 'password': 'ValidTestPass123!'}).status_code == 409
    assert client.post('/api/auth/login', json={'email': 'one@example.invalid', 'password': 'wrong-password'}).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'one@example.invalid', 'password': 'ValidTestPass123!'}).status_code == 200
    assert client.get('/api/auth/me', headers=headers).json()['user']['email'] == 'one@example.invalid'
    assert client.post('/api/watchlist', headers=headers, json={'product_id': 'prod-01'}).status_code == 200
    saved = client.get('/api/watchlist', headers=headers).json()['items']
    assert saved[0]['catalogue_id'] == 'prod-01'
    assert 'Watermelon' in saved[0]['title']
    assert client.put('/api/profile', headers=headers, json={'skin_type': 'oily', 'budget_min': 200, 'budget_max': 2000, 'makeup_preferences': {'finish_preference': 'matte'}}).status_code == 200
    assert client.get('/api/profile', headers=headers).json()['profile']['skin_type'] == 'oily'
    assert client.delete('/api/watchlist/prod-01', headers=headers).status_code == 200
    assert client.get('/api/watchlist', headers=headers).json()['items'] == []


def test_routines_and_price_alerts_persist_and_are_private(client):
    first = register(client, 'first@example.invalid')
    headers = {'Authorization': 'Bearer ' + first}
    routines = client.get('/api/routines', headers=headers)
    assert routines.status_code == 200, routines.text
    routine = routines.json()['routines'][0]
    step = client.post(f"/api/routines/{routine['id']}/items", headers=headers, json={'step_name': 'Test cleanse', 'custom_product_name': 'Demo cleanser'})
    assert step.status_code == 200, step.text
    assert client.get('/api/routines', headers=headers).json()['routines'][0]['items'][-1]['step_name'] == 'Test cleanse'
    state = {'trackedProducts': [{'id': 'track-test', 'productId': 'prod-01', 'targetPrice': 450, 'currency': 'INR', 'isTracking': True, 'addedAt': '2026-11-25'}], 'alerts': []}
    assert client.put('/api/shopping-state', headers=headers, json=state).status_code == 200
    assert client.get('/api/shopping-state', headers=headers).json()['trackedProducts'][0]['targetPrice'] == 450
    second = register(client, 'second@example.invalid')
    second_headers = {'Authorization': 'Bearer ' + second}
    assert client.get('/api/shopping-state', headers=second_headers).json()['trackedProducts'] == []
    assert client.delete(f"/api/routines/{routine['id']}", headers=second_headers).status_code == 404
    assert client.get('/api/watchlist', headers=second_headers).json()['items'] == []
    client.cookies.clear()
    assert client.get('/api/profile').status_code == 401
    assert client.get('/api/shopping-state').status_code == 401
    assert client.put('/api/shopping-state', headers=headers, json={'trackedProducts': [{**state['trackedProducts'][0], 'targetPrice': -1}]}).status_code == 422


def test_allowed_frontend_origin_and_demo_prices(client):
    response = client.options('/api/auth/login', headers={'Origin': 'https://master2007-star.github.io', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'})
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'https://master2007-star.github.io'
    local = client.options('/api/auth/login', headers={'Origin': 'http://127.0.0.1:5174', 'Access-Control-Request-Method': 'POST'})
    assert local.status_code == 200
    assert client.get('/api/health').json()['record_count'] == 23
    assert client.get('/api/compare/auto?product_id=1').status_code == 409
