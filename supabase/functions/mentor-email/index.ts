import nodemailer from 'npm:nodemailer@^9';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const workerSecret = Deno.env.get('EMAIL_WORKER_SECRET') || Deno.env.get('PUSH_WORKER_SECRET');
const smtpHost = Deno.env.get('SMTP_HOSTNAME');
const smtpPort = Number(Deno.env.get('SMTP_PORT') || '587');
const smtpUsername = Deno.env.get('SMTP_USERNAME');
const smtpPassword = Deno.env.get('SMTP_PASSWORD');
const smtpFrom = Deno.env.get('SMTP_FROM');
const siteUrl = Deno.env.get('EMAIL_SITE_URL') || 'https://fap-nextgen-app.vercel.app';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');

const isConfigured = Boolean(
  workerSecret && smtpHost && smtpUsername && smtpPassword && smtpFrom && serviceKey && supabaseUrl,
);

const transport = isConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUsername, pass: smtpPassword },
    })
  : null;

const emailFor = ({ kind, site }) => {
  const isMessage = kind === 'message';
  return {
    subject: isMessage
      ? 'New student message in FAP NextGen'
      : 'New student reflection in FAP NextGen',
    text: isMessage
      ? `A student assigned to you sent a new message. Sign in to view it: ${site}/teacher-dashboard/messages`
      : `A student assigned to you submitted a new reflection. Sign in to review it: ${site}/teacher-dashboard`,
  };
};

const sendEmail = async ({ to, kind }) => {
  if (!transport || !smtpFrom) throw new Error('Email service is not configured');
  const content = emailFor({ kind, site: siteUrl });
  await transport.sendMail({ from: smtpFrom, to, subject: content.subject, text: content.text });
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!workerSecret || request.headers.get('x-email-worker-secret') !== workerSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!isConfigured || !transport || !serviceKey || !supabaseUrl) {
    return new Response('Email service is not configured', { status: 503 });
  }

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: jobs, error } = await client.rpc('claim_mentor_email_jobs');
  if (error) return new Response('Unable to claim email jobs', { status: 500 });

  for (const job of jobs || []) {
    try {
      const source = job.event_kind === 'message'
        ? await client.from('messages').select('sender_id,recipient_id,deleted_at').eq('id', job.source_id).maybeSingle()
        : await client.from('reflections').select('student_id').eq('id', job.source_id).maybeSingle();
      if (source.error) throw source.error;

      const studentId = source.data && ('sender_id' in source.data ? source.data.sender_id : source.data.student_id);
      const assignment = studentId
        ? await client.from('teacher_student_mappings')
          .select('student_id,teacher_id,is_active')
          .eq('student_id', studentId)
          .eq('teacher_id', job.mentor_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        : { data: null, error: null };
      if (assignment.error) throw assignment.error;

      const validMessage = job.event_kind !== 'message' || (source.data?.recipient_id === job.mentor_id && !source.data?.deleted_at);
      if (!source.data || !assignment.data?.is_active || assignment.data.teacher_id !== job.mentor_id || assignment.data.student_id !== studentId || !validMessage) {
        await client.rpc('finish_mentor_email_job', { job_id: job.id, retry: false });
        continue;
      }

      const mentor = await client.from('profiles').select('email').eq('id', job.mentor_id).eq('role', 'teacher').eq('is_active', true).maybeSingle();
      if (mentor.error) throw mentor.error;
      const recipient = mentor.data?.email?.trim();
      if (!recipient) {
        await client.rpc('finish_mentor_email_job', { job_id: job.id, retry: false });
        continue;
      }

      await sendEmail({ to: recipient, kind: job.event_kind });
      const { error: finishError } = await client.rpc('finish_mentor_email_job', { job_id: job.id, retry: false });
      if (finishError) throw finishError;
    } catch (err) {
      console.error('Mentor email job failed:', err instanceof Error ? err.message : 'unknown error');
      await client.rpc('finish_mentor_email_job', { job_id: job.id, retry: true });
    }
  }

  return Response.json({ processed: jobs?.length || 0 });
});
