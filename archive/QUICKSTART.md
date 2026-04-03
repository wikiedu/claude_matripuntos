# Matripuntos - Quick Start Guide

## Prerequisites

- Node.js 18+ (includes npm)
- Two terminal windows or tabs

## 1. Setup

### Install dependencies
```bash
# From root directory
npm install
```

This installs dependencies for both frontend and backend.

## 2. Start Backend Server

### Terminal 1: Start the backend
```bash
cd src/backend
npm run build    # Compile TypeScript → JavaScript
npm start        # Start Express server on http://localhost:3000
```

You should see:
```
🚀 Matripuntos backend running on http://localhost:3000
📊 Health check: http://localhost:3000/api/health
```

### Test health check
```bash
curl http://localhost:3000/api/health
```

## 3. Start Frontend Dev Server

### Terminal 2: Start the frontend
```bash
cd src/frontend
npm run dev      # Start Vite dev server on http://localhost:5173
```

You should see something like:
```
VITE v5.4.21  ready in XXX ms

Local: http://localhost:5173/
```

## 4. Test the Complete Flow

### Option A: Manual Testing via Browser

1. Open http://localhost:5173 in your browser
2. You'll be redirected to the login page
3. Sign up: Create a couple account with:
   - User 1: alice@test.com / password123 / Alice
   - User 2: bob@test.com / password123 / Bob
4. After signup, login with User 1 credentials
5. You'll see the Dashboard
6. Click "Solicitar Actividad" to create an activity request
7. Fill out the form and submit - it will create an event + negotiation in the database

### Option B: Automated API Testing

In Terminal 3, run the demo script:
```bash
node DEMO_SCRIPT.js
```

This will:
1. ✓ Create couple account
2. ✓ Login both users
3. ✓ Create tasks
4. ✓ Create activity request
5. ✓ Propose negotiation (13.5 pts)
6. ✓ Counter-propose (15 pts)
7. ✓ Accept proposal
8. ✓ Verify final state

### Option C: Manual cURL Testing

See `TEST_API.md` for detailed cURL examples of all endpoints.

Example:
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email1": "user1@test.com",
    "password1": "password123",
    "name1": "Alice",
    "email2": "user2@test.com",
    "password2": "password123",
    "name2": "Bob"
  }'
```

## 5. Database

### View/Manage Data with Prisma Studio

```bash
cd src/backend
npx prisma studio
```

This opens http://localhost:5555 with a visual database browser.

## 6. Project Structure

```
Matripuntos/
├── docs/                    # Specification documents
├── src/
│   ├── frontend/           # React + Vite app
│   │   ├── src/
│   │   │   ├── pages/      # Dashboard, RequestActivity, RequestInbox, Login
│   │   │   ├── services/   # apiClient (API communication)
│   │   │   ├── store/      # Zustand store (state management)
│   │   │   └── utils/      # pointsCalculator (business logic)
│   │   └── dist/           # Built frontend (production)
│   └── backend/            # Node + Express API
│       ├── src/
│       │   ├── routes/     # /auth, /events, /tasks, /negotiations
│       │   ├── services/   # authService (business logic)
│       │   ├── middleware/ # authMiddleware (JWT verification)
│       │   └── schemas/    # Zod validation
│       ├── prisma/
│       │   ├── schema.prisma  # Database schema
│       │   └── dev.db         # SQLite database (local)
│       └── dist/           # Built backend (production)
└── README.md               # Project overview
```

## 7. Key Endpoints

### Authentication
- `POST /api/auth/signup` - Create couple account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/couple` - Get couple + configuration

### Events (Activities)
- `POST /api/events` - Create activity request
- `GET /api/events` - List activities
- `GET /api/events/:id` - Get activity details
- `PUT /api/events/:id` - Update activity
- `DELETE /api/events/:id` - Delete activity (draft only)

### Tasks (Daily)
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks
- `POST /api/tasks/:taskId/log` - Log task completion
- `GET /api/tasks/:taskId/logs` - Get task history
- `PUT /api/tasks/:taskId/logs/:logId/verify` - Verify completion
- `PUT /api/tasks/:taskId/logs/:logId/dispute` - Dispute completion

### Negotiations
- `POST /api/negotiations` - Propose activity
- `PUT /api/negotiations/:id/respond` - Respond to proposal
- `GET /api/negotiations/event/:eventId` - Get negotiations for event
- `POST /api/negotiations/:id/force` - Force agreement with matripuntos

## 8. Common Tasks

### Rebuild frontend
```bash
cd src/frontend
npm run build
```

### Rebuild backend
```bash
cd src/backend
npm run build
```

### Reset database
```bash
cd src/backend
rm prisma/dev.db
npx prisma migrate dev --name init
```

### Check TypeScript types
```bash
# Frontend
cd src/frontend
npm run type-check

# Backend
cd src/backend
npm run type-check
```

### Run linter
```bash
npm run lint
```

## 9. Troubleshooting

### Port already in use
- Backend (3000): `lsof -i :3000` and kill the process
- Frontend (5173): `lsof -i :5173` and kill the process

### Token invalid/expired
- Clear browser localStorage: DevTools → Application → Storage → Local Storage → Clear
- Or logout and login again

### Database issues
- Delete `src/backend/prisma/dev.db`
- Run `npx prisma migrate dev --name init`

### Module not found errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check file paths use correct case (especially on Windows)

## 10. Next Steps

After testing locally:

1. **Add more features**:
   - Task verification flow
   - Points history/analytics
   - Configuration management
   - Notification system

2. **Deploy to cloud**:
   - Backend → Vercel or Railway
   - Frontend → Vercel
   - Database → Supabase PostgreSQL

3. **Mobile app**:
   - React Native or Flutter
   - Uses same backend API

## 11. Support

For issues or questions:
- Check `TEST_API.md` for API reference
- Check `docs/FLUJOS_UX.md` for user flows
- Review `src/backend/src/routes/` for endpoint implementations

---

**Happy testing! 🎉**
