# Mentor email notifications

Mentor emails are separate from Supabase Auth emails. New student-to-mentor messages and reflections create email outbox jobs alongside the existing web-push jobs. The worker sends a privacy-safe subject and link only; message bodies and clinical content are never included.

Deploy the `mentor-email` Edge Function and provision these function secrets:

- `EMAIL_WORKER_SECRET` — optional; if omitted, the worker reuses the existing `PUSH_WORKER_SECRET`
- `SMTP_HOSTNAME` — `smtp.gmail.com`
- `SMTP_PORT` — `587`
- `SMTP_USERNAME` — the Gmail sender address
- `SMTP_PASSWORD` — a Google App Password, entered without the display spaces, never the normal Google password
- `SMTP_FROM` — the sender address, for example `FAP NextGen <hssling4@gmail.com>`
- `EMAIL_SITE_URL` — `https://fap-nextgen-app.vercel.app`

The migration reuses the existing Vault values for the project URL, anon key, and worker secret to invoke the email worker every minute. The worker retries transient failures and re-checks that the mentor assignment is still active before sending.

## Pending grading digest

The deployed worker also supports a one-time pending-grading digest. It queues one privacy-safe summary email for each active mentor who has at least one `Pending` reflection, rather than sending one email per reflection. The service-role-only SQL function is:

```sql
select public.queue_pending_grade_email_jobs('unique-run-key');
```

The run key makes a digest idempotent: reusing the same key does not create duplicate mentor deliveries. The existing per-minute cron dispatcher processes the queued digest jobs.
