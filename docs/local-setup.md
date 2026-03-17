# Local Setup

## 1. Go to the project

```bash
cd /Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG
```

## 2. Create local env file

If `.env` does not exist:

```bash
cp .env.example .env
```

Set at least these values:

```env
GOOGLE_INTEGRATION_MODE=mock
MOCK_USER_EMAIL=admin@example.com
MOCK_USER_NAME=Internal Admin
MOCK_USER_ROLE=SUPER_ADMIN

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/drive_access_console"

APP_BASE_URL="http://localhost:3000"
SESSION_SECRET="change-this-to-a-long-random-string-1234567890"
ALLOWED_ADMIN_EMAILS="admin@example.com"
```

## 3. Start PostgreSQL with Docker

```bash
docker compose up -d
```

To confirm it is running:

```bash
docker compose ps
```

## 4. Apply schema and seed data

```bash
npx prisma migrate dev --name init
npm run db:seed
```

## 5. Start the app

```bash
npm run dev
```

Open:

- http://localhost:3000

## 6. Stop local database when done

```bash
docker compose down
```

If you want to remove the database volume too:

```bash
docker compose down -v
```
