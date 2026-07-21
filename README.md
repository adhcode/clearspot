# ClearSpot

Civic platform for illegal waste dump reporting and cleanup coordination.

## Structure

```
clearspot/
├── backend/     # NestJS API server
└── frontend/    # (Coming soon)
```

## Backend

See [backend/README.md](backend/README.md) for setup instructions.

**Stack:** NestJS, TypeScript, PostgreSQL, Prisma, JWT

## Quick Start

```bash
cd backend
pnpm install
docker-compose up -d postgres redis
pnpm prisma:generate
pnpm prisma:migrate dev
pnpm prisma:seed
pnpm start:dev
```

## Repository

https://github.com/adhcode/clearspot
