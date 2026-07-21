# ClearSpot Backend

Civic platform for illegal waste dump reporting and cleanup coordination.

**Repository:** https://github.com/adhcode/clearspot

## Stack

- NestJS + TypeScript (strict mode)
- PostgreSQL + Prisma ORM
- JWT Authentication
- Docker

## Quick Start

```bash
# Install
pnpm install

# Setup environment
cp .env.example .env

# Start infrastructure
docker-compose up -d postgres redis

# Database
pnpm prisma:generate
pnpm prisma:migrate dev
pnpm prisma:seed

# Start
pnpm start:dev
```

Server runs at `http://localhost:3000/api/v1`

## Development

```bash
pnpm start:dev       # Development server
pnpm lint            # Lint code
pnpm test            # Run tests
pnpm prisma:studio   # Database GUI
```

## Structure

```
src/
├── common/          # Shared utilities
├── config/          # Configuration
├── database/        # Prisma service
├── integrations/    # External services (R2, Gemini, Monnify)
└── modules/         # Feature modules
    ├── auth/        # Authentication
    ├── incidents/   # Incident reporting
    ├── payments/    # Payment processing
    └── vendors/     # Vendor management
```

## Test Credentials

After `pnpm prisma:seed`:
- Admin: `admin@clearspot.com` / `Admin@123`
- Officer: `officer@clearspot.com` / `Officer@123`
