from app import app
with app.test_client() as client:
    resp = client.get('/api/students', headers={'X-Forwarded-For': '8.8.8.8, 1.1.1.1'})
    print(resp.status_code)
    print(resp.json)
