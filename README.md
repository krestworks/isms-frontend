Authentication Module — Complete
Backend (backend/)
File	Purpose
prisma/schema.prisma	User + AuditLog models (SQLite via Prisma 5)
prisma/seed.js	Seeds 3 default users (Admin, Manager, Attendant)
src/config/env.js	Env vars + validation
src/config/prisma.js	Shared Prisma client singleton
src/utils/jwt.js	Access/refresh token generation + reset token hashing
src/utils/validators.js	express-validator rules for all endpoints
src/middleware/auth.js	Bearer token verification middleware
src/middleware/authorize.js	Role-based authorization (authorize("Admin","Manager"))
src/middleware/errorHandler.js	Global error handler + 404 handler
src/controllers/authController.js	All auth logic with audit logging
src/routes/auth.js	9 routes with rate limiting
src/server.js	Express app — CORS, Helmet, cookie-parser
index.js	Entry point — DB connect + server start
API Routes:

POST /api/auth/login — Rate limited (10/15min), returns JWT + sets httpOnly refresh cookie
POST /api/auth/logout — Clears DB token + cookie
POST /api/auth/refresh — Silent token rotation with reuse detection
GET /api/auth/me — Returns current user
PUT /api/auth/change-password — Invalidates all sessions
POST /api/auth/forgot-password — Generates reset token (dev mode returns token directly)
POST /api/auth/reset-password — Validates token, updates password
PUT /api/auth/switch-role — Issues new JWT for different role
GET /api/health — Health check
Frontend (frontend/src/)
File	Purpose
lib/api.ts	Fetch wrapper with auto-refresh interceptor
lib/authService.ts	Typed calls to all auth endpoints
components/auth/AuthProvider.tsx	React context — session restore on mount, login/logout/switchRole
pages/LoginPage.tsx	Branded login + forgot-password + reset-password in one page
App.tsx	RequireAuth guard — redirects to /login, restores from URL
To start the system:

# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
Default credentials:

admin@isms.co.ke / Admin@1234
manager@isms.co.ke / Manager@1234
attendant@isms.co.ke / Attend@1234