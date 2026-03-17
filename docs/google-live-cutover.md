# Google Live Cutover

This is the minimum path to move from `mock` mode to live Google Workspace integration.

## 1. Update `.env`

Set:

```env
GOOGLE_INTEGRATION_MODE=google
GOOGLE_IMPERSONATED_ADMIN=workspace-admin@conceivable.life
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}'
GOOGLE_REPORTS_FOLDER_ID=your-drive-folder-id
GOOGLE_REPORTS_SHARED_DRIVE_ID=your-shared-drive-id
```

If Google sign-in should also be live:

```env
AUTH_MODE=google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
GOOGLE_HOSTED_DOMAIN=conceivable.life
APP_BASE_URL=http://localhost:3000
SESSION_SECRET=a-long-random-secret
ALLOWED_ADMIN_EMAILS=rodrigo@conceivable.life
ADMIN_ROLE_OVERRIDES=rodrigo@conceivable.life:SUPER_ADMIN
```

## 2. Authorize the service account in Google Workspace

The service account client ID must be authorized for these scopes:

- `https://www.googleapis.com/auth/admin.directory.group`
- `https://www.googleapis.com/auth/admin.directory.group.member.readonly`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/drive`

## 3. Restart the app

```bash
npm run dev
```

## 4. Run read-only probes

Open:

- `http://localhost:3000/google-integration`

Then verify:

- Directory search probe passes
- Group membership probe passes against one managed group

Do this before using `Users` to add or remove real group members.

## 5. First write tests

After the read-only probes pass:

1. assign a role to a non-critical test user in `/users`
2. confirm the Google Group membership changed
3. confirm `/access-viewer` reflects the new inherited access
4. remove the role and verify the membership is revoked

## 6. Report upload test

After Directory API checks pass, generate one report from `/reports` and confirm:

- file exists in the configured Google Drive folder
- `GeneratedReport` stored the file ID and URL
