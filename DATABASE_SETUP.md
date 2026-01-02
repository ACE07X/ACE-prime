# Database Setup Guide

## 🗄️ PostgreSQL Database for ACE Prime

ACE Prime uses **Prisma** with **PostgreSQL** for persistent data storage.

## Quick Setup

### 1. Local Development

1. Install PostgreSQL locally or use a cloud service
2. Create a `.env` file from `env.example`:
   ```bash
   cp env.example .env
   ```
3. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/ace_prime
   ```
4. Generate Prisma Client:
   ```bash
   npm run db:generate
   ```
5. Run migrations:
   ```bash
   npm run db:migrate
   ```

### 2. Railway Deployment

#### Option A: Railway PostgreSQL Service (Recommended)

1. In Railway dashboard, add a **PostgreSQL** service
2. Railway will automatically provide `DATABASE_URL` environment variable
3. Your bot service will automatically connect to it

#### Option B: External PostgreSQL

1. Get your PostgreSQL connection string
2. Add to Railway Variables:
   - Name: `DATABASE_URL`
   - Value: `postgresql://user:password@host:5432/database`

### 3. Run Migrations on Railway

Railway will automatically run migrations during build because `npm run build` includes `prisma generate`.

For initial setup, you may need to run migrations manually:

```bash
# Via Railway CLI
railway run npm run db:migrate:deploy

# Or add to Railway build command (already included)
```

## Database Schema

### Projects Table
- Stores project information
- Unique per guild (server)
- Tracks owner and creation time

### Users Table (Future)
- User preferences and settings
- Ready for future features

## Commands

```bash
# Generate Prisma Client
npm run db:generate

# Create and run migration (dev)
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Open Prisma Studio (GUI)
npm run db:studio
```

## Troubleshooting

### "Database not connected" warning
- Bot will continue to run
- Project commands won't work
- Check `DATABASE_URL` environment variable

### Migration errors
- Make sure PostgreSQL is running
- Check connection string format
- Verify database exists

### Prisma Client not generated
- Run `npm run db:generate`
- Check `prisma/schema.prisma` syntax
- Ensure `@prisma/client` is installed

## Environment Variables

Required for database:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `NODE_ENV` - Set to `production` for Railway

