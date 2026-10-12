# AMAHAS — Production Deployment & Rollback Guide

## 1. Prerequisites
- Node.js >= 20.x or 22.x
- Environment variables configured (refer to `.env.example`)
- SQLite storage directory writable, or external PostgreSQL connection string.

---

## 2. Production Build & Start
```bash
# 1. Install dependencies
npm ci

# 2. Push database schema
npm run db:push

# 3. Seed demonstration / initial data if needed
npm run db:seed

# 4. Compile optimized Next.js production build
npm run build

# 5. Start production server
npm start -p 3000
```

---

## 3. Rollback Procedure
If a regression occurs during deployment:
1. Revert to the prior Git release tag: `git checkout <release-tag>`
2. If migrations were strictly additive (as mandated by Section 1.4), the existing database remains compatible.
3. Re-execute `npm run build && npm start`.
