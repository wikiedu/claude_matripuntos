# Matripuntos API - Test Guide

## Quick Test Flow

### 1. Signup (Create Couple + Users)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email1": "user1@test.com",
    "password1": "password123",
    "name1": "Alice",
    "email2": "user2@test.com",
    "password2": "password123",
    "name2": "Bob",
    "language": "es"
  }'
```

Response:
```json
{
  "message": "Couple registered successfully",
  "coupleId": "clxxxxx",
  "users": [
    { "id": "clxxxxx", "email": "user1@test.com", "name": "Alice", "coupleId": "clxxxxx" },
    { "id": "clxxxxx", "email": "user2@test.com", "name": "Bob", "coupleId": "clxxxxx" }
  ]
}
```

### 2. Login (Get Token)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxxxx",
    "email": "user1@test.com",
    "name": "Alice",
    "coupleId": "clxxxxx",
    "role": "user",
    "timezone": "Europe/Madrid"
  }
}
```

Save the token: `TOKEN="eyJhbGc..."`

### 3. Get Current User (Protected Route)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Couple Data
```bash
curl http://localhost:3000/api/auth/couple \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cocina",
    "category": "cocina",
    "pointsBase": 2.0,
    "isDefault": true
  }'
```

### 6. Create Event (Activity Request)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "cena",
    "title": "Cena con amigos",
    "description": "Viernes noche en el restaurante",
    "dateStart": "2026-04-11T19:30:00Z",
    "dateEnd": "2026-04-11T23:30:00Z",
    "hasChildren": false,
    "numChildren": 0,
    "pointsBase": 13.5
  }'
```

Response:
```json
{
  "message": "Activity request created",
  "event": {
    "id": "clxxxxx",
    "type": "cena",
    "title": "Cena con amigos",
    "dateStart": "2026-04-11T19:30:00.000Z",
    "dateEnd": "2026-04-11T23:30:00.000Z",
    "pointsBase": "13.5",
    "pointsCalculated": "13.5",
    "status": "draft"
  }
}
```

Save event ID: `EVENT_ID="clxxxxx"`

### 7. Get All Events
```bash
curl "http://localhost:3000/api/events" \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Create Negotiation (Propose Activity)
```bash
curl -X POST http://localhost:3000/api/negotiations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "eventId": "'$EVENT_ID'",
    "pointsProposed": 13.5,
    "message": "I want to go to dinner on Friday"
  }'
```

Response:
```json
{
  "message": "Activity proposal sent",
  "negotiation": {
    "id": "clxxxxx",
    "eventId": "clxxxxx",
    "roundNumber": 1,
    "pointsProposed": "13.5",
    "responseType": "awaiting"
  }
```

Save negotiation ID: `NEG_ID="clxxxxx"`

### 9. Get Negotiations for Event
```bash
curl "http://localhost:3000/api/negotiations/event/$EVENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 10. Respond to Negotiation (Accept)
```bash
curl -X PUT http://localhost:3000/api/negotiations/$NEG_ID/respond \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "responseType": "accepted"
  }'
```

### 11. Counter-Propose
```bash
curl -X PUT http://localhost:3000/api/negotiations/$NEG_ID/respond \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "responseType": "counter_proposed",
    "pointsProposed": 15.0,
    "message": "Actually, I think it should be more"
  }'
```

## Health Check
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-03-31T..."
}
```
