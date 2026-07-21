# Getting Started

## Setup (5 minutes)

```bash
# Install dependencies
cd backend
pnpm install

# Start infrastructure
docker-compose up -d postgres redis

# Setup database
pnpm prisma:generate
pnpm prisma:migrate dev
pnpm prisma:seed

# Start server
pnpm start:dev
```

Server: `http://localhost:3000/api/v1`

## Test Credentials

```
Admin:   admin@clearspot.com / Admin@123
Officer: officer@clearspot.com / Officer@123
```

## Common Commands

```bash
pnpm start:dev        # Development
pnpm prisma:studio    # Database GUI
pnpm lint             # Lint code
pnpm test             # Run tests
```

## Configure External Services

Update `.env` with:
- Cloudflare R2 credentials
- Google Gemini API key
- Monnify API credentials

## Troubleshooting

**Database connection:**
```bash
docker-compose logs postgres
docker-compose restart postgres
```

**Port conflict:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Prisma issues:**
```bash
pnpm prisma:generate
```
