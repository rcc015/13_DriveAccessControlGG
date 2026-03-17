# Project Structure

```text
app/
  (dashboard)/
    users/
    access-requests/
    access-reviews/
    reports/
    templates/
  api/
components/
  dashboard/
docs/
lib/
  auth/
  config/
  db/
  google/
  reports/
  services/
prisma/
types/
```

## Folder intent

- `app/`: Next.js routes, pages, layouts, and API handlers
- `components/`: reusable UI shell and feature components
- `docs/`: architecture, Google integration plan, and implementation plan
- `lib/google/`: Google Admin SDK and Drive API clients
- `lib/services/`: business services for memberships, requests, reviews, reports, and templates
- `prisma/`: database schema and seed data
- `types/`: shared domain types
