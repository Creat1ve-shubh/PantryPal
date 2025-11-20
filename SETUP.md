# Setup Guide

Complete installation and configuration guide for PantryPal.

---

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (or Neon serverless account)
- **Gmail** account (for email invites)
- **Twilio** account (optional, for SMS notifications)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/Creat1ve-shubh/PantryPal.git
cd PantryPal

# Install dependencies
npm install

# Copy environment template
cp .env.docker .env

# Apply database schema
npm run db:push

# (Optional) Seed roles and permissions
npx tsx server/scripts/seed-rbac.ts

# (Optional) Create test users
npx tsx server/scripts/seed-test-users.ts

# Start development server
npm run dev
```

Development server runs at: **http://localhost:5000**

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

### Database

```env
DATABASE_URL=postgresql://user:password@host:port/db
```

### Authentication

```env
SESSION_SECRET=replace-with-strong-random-string
JWT_ACCESS_SECRET=access-secret-key
JWT_REFRESH_SECRET=refresh-secret-key
```

### Application

```env
APP_BASE_URL=http://localhost:5000
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
```

### Email (Nodemailer)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### SMS (Twilio - Optional)

```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Generating Secure Secrets

```bash
# Generate random 32-byte hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## NPM Scripts

| Script                 | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Start development server with hot reload (Express + Vite) |
| `npm run build`        | Build production bundle (frontend + backend)              |
| `npm start`            | Run production server from `dist/`                        |
| `npm run db:push`      | Apply Drizzle schema changes to database                  |
| `npm run check`        | Run TypeScript type checking                              |
| `npm test`             | Run test suite (Vitest + Playwright - planned)            |
| `npm run docker:build` | Build Docker production image                             |
| `npm run docker:up`    | Start application in Docker containers                    |
| `npm run docker:down`  | Stop and remove Docker containers                         |

---

## Docker Setup

### Production Build

```bash
# Build image
docker build -t pantrypal:latest .

# Run container
docker run -p 5000:5000 --env-file .env pantrypal:latest
```

### Development with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop services
docker-compose down
```

---

## Database Migrations

PantryPal uses Drizzle ORM for schema management.

### Push Schema Changes

```bash
npm run db:push
```

### Seed Initial Data

```bash
# Seed RBAC roles and permissions
npx tsx server/scripts/seed-rbac.ts

# Create test users for development
npx tsx server/scripts/seed-test-users.ts

# Test invitation flow
npx tsx server/scripts/test-invite.ts
```

---

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check database server is running and accessible
- Ensure firewall allows connection to database port

### Email Sending Failures

- Use Gmail App Password (not regular password)
- Enable "Less secure app access" if using standard auth
- Check SMTP credentials and port configuration

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

---

## Next Steps

- Review [Architecture Documentation](./ARCHITECTURE.md)
- Check [Extended Documentation](./docs/README.md) for auth, security, and deployment guides
- Read [Contributing Guidelines](./CONTRIBUTING.md) to start developing

---

[← Back to Main README](./README.md)
