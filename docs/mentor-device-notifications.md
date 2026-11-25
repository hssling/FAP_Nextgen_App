# Mentor device notifications

Mentors enable device notifications in Settings on each device. iPhone and iPad users must first add FAP NextGen to the Home Screen and open it there. Signing out unsubscribes that device; the mentor can enable notifications again after signing in.

New reflections and student-to-mentor messages are queued in the database and delivered in batches by the `mentor-push` Edge Function. Payloads contain no student or clinical text. The worker checks that the mentor assignment remains active, removes expired device subscriptions, and retries transient failures. Notifications are best effort and can be delayed by device settings or service availability; existing in-app counts remain available.

The database migration creates a private outbox and two Supabase Cron jobs. The delivery job runs once a minute only when work is due; the cleanup job removes completed entries after seven days and exhausted entries after thirty days. Check `cron.job_run_details`, the Edge Function logs, and pending outbox attempts when investigating failures. Supabase Free quotas apply to the whole organization.

Provision `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` and `PUSH_WORKER_SECRET` as Edge Function secrets. Store the same worker secret in Supabase Vault as `fap_mentor_push_worker_secret`, and the project's base URL as `fap_mentor_push_project_url`. Never put the private key or worker secret in frontend configuration or version control. The function exposes only the public key over GET; POST requests require the worker secret. Deploy the function with JWT verification disabled because its scheduled POST is authenticated by that secret.

Email alerts are separate and not enabled by this implementation. Supabase Auth's default email service is not a general notification sender; an external mail provider, verified sender, credentials, and a notification workflow would be required.
