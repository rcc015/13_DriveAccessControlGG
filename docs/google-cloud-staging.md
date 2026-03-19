# Google Cloud Staging Plan

This project is ready for a shared staging environment on Google Cloud.

Recommended target stack:

- `Cloud Run` for the Next.js app
- `Cloud SQL for PostgreSQL` for the database
- `Secret Manager` for runtime secrets
- `Artifact Registry` for the built image

## What was added

- [Dockerfile](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/Dockerfile)
- [cloudbuild.yaml](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/cloudbuild.yaml)
- `Next.js` standalone output in [next.config.ts](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/next.config.ts)

## Staging resources to create

1. `Artifact Registry` repository
2. `Cloud SQL` PostgreSQL instance
3. `Cloud Run` service
4. runtime service account
5. `Secret Manager` secrets

## Suggested naming

- service: `drive-access-console-staging`
- database: `drive_access_console`
- artifact repository: `drive-access-console`
- runtime service account: `drive-access-console-runtime`

## Required secrets

Store these in `Secret Manager` using the exact names expected by [cloudbuild.yaml](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/cloudbuild.yaml):

- `AUTH_MODE`
- `GOOGLE_INTEGRATION_MODE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_HOSTED_DOMAIN`
- `GOOGLE_IMPERSONATED_ADMIN`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_REPORTS_FOLDER_ID`
- `GOOGLE_REPORTS_SHARED_DRIVE_ID`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ALLOWED_ADMIN_EMAILS`
- `ADMIN_ROLE_OVERRIDES`

## Database notes

Use a Cloud SQL `DATABASE_URL` that works from Cloud Run. Two common patterns are:

- Cloud SQL connector socket form
- private IP form inside the VPC

For Prisma and Cloud Run, the socket form is usually simplest:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost/drive_access_console?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

## First-time deploy flow

1. Create the Cloud SQL instance and database.
2. Create the runtime service account.
3. Grant the runtime service account:
   - `Cloud SQL Client`
   - `Secret Manager Secret Accessor`
4. Create all required secrets in Secret Manager.
5. Update substitutions in [cloudbuild.yaml](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/cloudbuild.yaml):
   - `_CLOUDSQL_INSTANCE`
   - `_APP_BASE_URL`
6. Build and deploy:

```bash
gcloud builds submit --config cloudbuild.yaml
```

7. Run Prisma migration against staging DB from a trusted machine:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@localhost/drive_access_console?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME' npx prisma migrate deploy
DATABASE_URL='postgresql://USER:PASSWORD@localhost/drive_access_console?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME' npm run db:seed
```

## Recommended rollout order

1. Deploy staging
2. Validate Google login
3. Validate Google Integration probes
4. Validate one report upload
5. Validate one business role assignment and revocation
6. Then decide whether to create a separate production environment
