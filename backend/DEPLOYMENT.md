# Deployment

## Prerequisites

- Node.js 20+, pnpm 8+
- PostgreSQL 16+, Redis 7+
- Docker (optional)

## Environment

```bash
cp .env.example .env.production
# Update with production values
# Generate JWT_SECRET: openssl rand -base64 32
```

## Docker

```bash
docker build --target production -t clearspot-backend .
docker run -d -p 3000:3000 --env-file .env.production clearspot-backend
```

## Manual

```bash
pnpm install --prod --frozen-lockfile
pnpm prisma:generate
pnpm build
pnpm prisma:migrate:prod
pnpm start:prod
```

## Security Checklist

- [ ] Strong JWT_SECRET
- [ ] Database credentials secured
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] No secrets in logs

## Scaling

**Horizontal:** Stateless app, use load balancer, shared Redis  
**Vertical:** Increase resources, tune DB connection pool
