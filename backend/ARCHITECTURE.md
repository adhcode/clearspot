# Architecture

## Layers

```
Controller (HTTP) → Service (Business Logic) → Prisma (Data) → PostgreSQL
```

## Module Structure

```
module-name/
├── dto/
├── module-name.controller.ts
├── module-name.service.ts
└── module-name.module.ts
```

## Key Principles

**TypeScript:** Strict mode, explicit return types, no `any`  
**Security:** JWT auth, RBAC, input validation, rate limiting  
**Database:** Prisma ORM, proper indexing, transactions  
**External Services:** Provider pattern for replaceability  

## Auth Flow

```
Client → Login → Validate → Generate JWT → Return Token
Protected Endpoints → Verify JWT → Check Role → Allow/Deny
```

## Citizen-First Design

Citizens can report incidents **without authentication**:
- No signup required
- Optional email/phone for updates
- Can claim account later to link all reports

Officers, Vendors, and Admins require authentication.
