# Backup and Restore Runbook (Safe Family Edit Rollout)

## 1) Create Git Restore Point

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create_restore_point.ps1 -Label pre-safe-family-edit
```

This creates:
- A backup branch: `backup/pre-safe-family-edit-YYYYMMDD-HHMMSS`
- An annotated tag: `restore/pre-safe-family-edit-YYYYMMDD-HHMMSS`

## 2) Create Database Backup

Set the connection string first (Supabase or Postgres URL):

```powershell
$env:SUPABASE_DB_URL = "postgresql://USER:PASSWORD@HOST:5432/postgres"
```

Run backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create_db_backup.ps1 -Label pre-safe-family-edit
```

Output file goes to `_backups\` with timestamp.

## 3) Apply Phase-1 SQL Patches

Run in Supabase SQL editor in this order:
1. `safe_family_edit_phase1_schema.sql`
2. `safe_family_edit_phase1_rls.sql`
3. `safe_family_edit_phase1_validation.sql`

## 4) Emergency Rollback

### Git rollback to restore tag
```powershell
git checkout restore/<your-tag>
```

### Database restore
```powershell
pg_restore --clean --if-exists --no-owner --no-privileges -d "$env:SUPABASE_DB_URL" "_backups\<your-backup-file>.dump"
```

Use a staging/temporary database to validate restore before production restore.
