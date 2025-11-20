# Architecture Documentation

Technical architecture, design decisions, and structure overview for PantryPal.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [API Design](#api-design)

---

## Tech Stack

### Frontend

- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite (fast HMR and optimized builds)
- **Routing**: React Router v7
- **State Management**: React Context API + TanStack Query
- **UI Components**:
  - Radix UI primitives (accessible, unstyled)
  - ShadCN UI component library
  - Tailwind CSS for styling
- **Forms**: React Hook Form + Zod validation
- **Data Visualization**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **QR/Barcode**: qr-scanner, qrcode, react-qr-code

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with Drizzle Kit
- **Authentication**:
  - Session-based: Passport.js + express-session
  - Token-based: JWT (access + refresh tokens)
- **Password Hashing**: bcrypt
- **Session Store**: connect-pg-simple (PostgreSQL)
- **Email**: Nodemailer (Gmail SMTP)
- **SMS**: Twilio SDK
- **Security**:
  - Helmet.js (HTTP headers)
  - express-rate-limit (API throttling)
  - CORS (cross-origin control)

### DevOps & Tooling

- **Container**: Docker multi-stage builds
- **Orchestration**: Docker Compose
- **Testing**: Vitest (unit), Playwright (e2e) - planned
- **Linting**: ESLint + Prettier
- **Package Manager**: npm

---

## System Architecture

### Current: Monolithic Deployment

```
┌─────────────────────────────────────┐
│         Docker Container            │
│                                     │
│  ┌─────────────────────────────┐  │
│  │      Express Server         │  │
│  │  ┌────────────────────────┐ │  │
│  │  │   API Routes (/api/*)  │ │  │
│  │  └────────────────────────┘ │  │
│  │  ┌────────────────────────┐ │  │
│  │  │  Static File Serving   │ │  │
│  │  │  (React Build)         │ │  │
│  │  └────────────────────────┘ │  │
│  └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
              ↓
    ┌─────────────────┐
    │  PostgreSQL DB  │
    │  (Neon/hosted)  │
    └─────────────────┘
```

### Future: Scaled Architecture

```
┌──────────────┐       ┌──────────────┐
│   CDN/Edge   │       │  API Server  │
│  (Frontend)  │←─────→│  (Express)   │
└──────────────┘       └──────────────┘
                              ↓
                    ┌─────────────────┐
                    │   Redis Cache   │
                    │  (Sessions/API) │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  PostgreSQL DB  │
                    │   (Primary)     │
                    └─────────────────┘
```

---

## Project Structure

```
PantryPal/
├── client/                          # Frontend application
│   ├── public/                      # Static assets
│   │   └── robots.txt
│   └── src/
│       ├── components/              # React components
│       │   ├── layout/              # Layout components
│       │   │   ├── AppSidebar.tsx   # Navigation sidebar
│       │   │   └── DashboardLayout.tsx
│       │   ├── ui/                  # ShadCN UI primitives
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   └── ... (40+ components)
│       │   ├── OrgIdDisplay.tsx     # Organization selector
│       │   └── ProtectedRoute.tsx   # Auth guard
│       ├── contexts/                # React Context providers
│       │   ├── AuthContext.tsx      # Session auth state
│       │   └── JWTAuthContext.tsx   # JWT auth state
│       ├── hooks/                   # Custom React hooks
│       │   ├── use-mobile.tsx
│       │   └── use-toast.ts
│       ├── lib/                     # Utilities
│       │   ├── api.ts               # API client (fetch wrapper)
│       │   └── utils.ts             # Helpers (cn, formatters)
│       ├── pages/                   # Route components
│       │   ├── Dashboard.tsx        # Main dashboard
│       │   ├── Inventory.tsx        # Stock management
│       │   ├── AddProduct.tsx       # Product creation
│       │   ├── ExpiryAlerts.tsx     # Expiry monitoring
│       │   ├── Billing.tsx          # Invoice list
│       │   ├── NewBill.tsx          # Invoice creation
│       │   ├── Customers.tsx        # Customer management
│       │   ├── Reports.tsx          # Analytics
│       │   ├── QRScanner.tsx        # Barcode scanner
│       │   ├── Index.tsx            # Landing page
│       │   └── NotFound.tsx         # 404 page
│       ├── App.tsx                  # Root component (routing)
│       ├── main.tsx                 # Entry point
│       └── index.css                # Global styles
│
├── server/                          # Backend application
│   ├── controllers/                 # Request handlers
│   │   ├── authController.ts        # Auth & invitations
│   │   └── rbacController.ts        # Role management
│   ├── middleware/                  # Express middleware
│   │   ├── errorHandler.ts          # Global error handling
│   │   └── jwtAuth.ts               # JWT verification
│   ├── services/                    # Business logic
│   │   ├── authService.ts           # Auth operations
│   │   ├── emailService.ts          # Email sending
│   │   └── smsService.ts            # SMS sending
│   ├── scripts/                     # Utility scripts
│   │   ├── seed-rbac.ts             # Seed roles/permissions
│   │   ├── seed-test-users.ts       # Create test data
│   │   └── test-invite.ts           # Test invitations
│   ├── utils/                       # Server utilities
│   │   └── jwt.ts                   # JWT helpers
│   ├── auth.ts                      # Passport.js configuration
│   ├── authRoutes.ts                # Session auth endpoints
│   ├── routes.jwt.ts                # JWT-protected routes
│   ├── routes.ts                    # Main API routes
│   ├── db.ts                        # Drizzle connection
│   ├── storage.ts                   # Data access layer
│   ├── vite.ts                      # Vite dev middleware
│   └── index.ts                     # Server entry point
│
├── shared/                          # Shared code
│   └── schema.ts                    # Drizzle ORM schema
│
├── docs/                            # Extended documentation
│   ├── README.md                    # Docs index
│   ├── AUTH_IMPLEMENTATION.md       # Auth deep dive
│   ├── SECURITY.md                  # Security practices
│   └── ... (other guides)
│
├── Dockerfile                       # Production image
├── Dockerfile.dev                   # Development image
├── docker-compose.yml               # Production compose
├── docker-compose.dev.yml           # Dev compose override
├── .dockerignore                    # Docker exclusions
├── drizzle.config.ts                # Drizzle ORM config
├── vite.config.ts                   # Vite build config
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json                    # TypeScript config
└── package.json                     # Dependencies
```

---

## Database Schema

### Core Entities

- **Users**: User accounts with credentials
- **Organizations**: Top-level tenant containers
- **Stores**: Physical locations within orgs
- **Roles**: RBAC role definitions (Admin, Manager, etc.)
- **Permissions**: Granular access control
- **Products**: Inventory items with QR codes
- **Stock**: Quantity tracking per store
- **Customers**: Billing contacts
- **Invoices**: Sales records
- **InviteTokens**: Invitation system
- **AuditLogs**: Action tracking (planned)

### Key Relationships

```
Organization (1) ──→ (N) Stores
Organization (1) ──→ (N) Users (via UserOrganization)
Store (1) ──→ (N) Products
Store (1) ──→ (N) Stock
Store (1) ──→ (N) Invoices
User (N) ←──→ (N) Roles (via UserRoles)
Role (N) ←──→ (N) Permissions (via RolePermissions)
```

See `shared/schema.ts` for complete Drizzle schema definitions.

---

## Authentication Flow

### Session-Based (Web App)

1. User submits credentials to `/api/auth/login`
2. Server validates via Passport.js local strategy
3. Session created in PostgreSQL (connect-pg-simple)
4. Session cookie sent to client
5. Subsequent requests include session cookie
6. Middleware `ensureAuthenticated` validates session

### JWT-Based (API/Mobile)

1. User submits credentials to `/api/jwt/login`
2. Server validates and issues:
   - Access token (15min expiry)
   - Refresh token (7d expiry, stored in DB)
3. Client stores tokens securely
4. API requests include `Authorization: Bearer <access_token>`
5. Middleware `authenticateJWT` validates token
6. Expired access tokens refreshed via `/api/jwt/refresh`

### Invitation Flow

1. Admin sends invite → generates token
2. Email/SMS sent with invitation link
3. Recipient clicks link → validates token
4. New user creates password
5. Account activated with pre-assigned role

---

## API Design

### Endpoint Structure

- **Session Auth**: `/api/auth/*` (login, logout, session)
- **JWT Auth**: `/api/jwt/*` (login, refresh, revoke)
- **Protected Routes**: `/api/*` (requires auth)
- **RBAC Admin**: `/api/rbac/*` (role management)

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Security Measures

- Rate limiting: 100 req/15min per IP
- Helmet.js security headers
- CORS whitelist configuration
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)

---

## Design Decisions

### Why Monolithic Start?

- Simpler deployment for MVP
- Single codebase reduces complexity
- Vite middleware enables seamless dev experience
- Easy to split later when scale demands it

### Why Dual Auth?

- Sessions: Better UX for web (automatic refresh)
- JWT: Required for API clients, mobile apps, integrations

### Why Drizzle ORM?

- Type-safe queries with full TypeScript inference
- Lightweight (no runtime overhead)
- SQL-like syntax (easy learning curve)
- Great migration tooling

### Why Neon PostgreSQL?

- Serverless (pay-per-use)
- Instant provisioning
- Connection pooling built-in
- Free tier suitable for development

---

## Scaling Considerations

### Performance Bottlenecks

- **Database**: Add read replicas, connection pooling
- **Sessions**: Migrate to Redis for distributed systems
- **Static Assets**: Move to CDN (Cloudflare, Vercel)
- **API**: Horizontal scaling with load balancer

### Future Enhancements

- GraphQL layer for complex queries
- WebSocket support for real-time updates
- Message queue (RabbitMQ/Redis) for background jobs
- Elasticsearch for advanced search
- Observability: OpenTelemetry, Grafana, Sentry

---

[← Back to Main README](./README.md)
