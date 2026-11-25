import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { deliverJob, shouldDeliver } from './deliverJob.js';

const workerSecret = Deno.env.get('PUSH_WORKER_SECRET');
const vapidPublic = Deno.env.get('WEB_PUSH_PUBLIC_KEY');
const vapidPrivate = Deno.env.get('WEB_PUSH_PRIVATE_KEY');
const vapidSubject = Deno.env.get('WEB_PUSH_SUBJECT');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');

type Subscription = { id: string; endpoint: string; keys: { p256dh: string; auth: string } };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type' } });
  if (request.method === 'GET') return Response.json({ publicKey: vapidPublic || null }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!workerSecret || request.headers.get('x-push-worker-secret') !== workerSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!vapidPublic || !vapidPrivate || !vapidSubject || !serviceKey || !supabaseUrl) {
    return new Response('Push service is not configured', { status: 503 });
  }
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const { data: jobs, error } = await client.rpc('claim_mentor_push_jobs');
  if (error) return new Response('Unable to claim notification jobs', { status: 500 });
  for (const job of jobs || []) {
    try {
      const source = job.event_kind === 'message'
        ? await client.from('messages').select('sender_id,recipient_id,deleted_at').eq('id', job.source_id).maybeSingle()
        : await client.from('reflections').select('student_id').eq('id', job.source_id).maybeSingle();
      if (source.error) throw source.error;
      const studentId = source.data && ('sender_id' in source.data ? source.data.sender_id : source.data.student_id);
      const assignment = studentId
        ? await client.from('teacher_student_mappings').select('student_id,teacher_id,is_active').eq('student_id', studentId).eq('teacher_id', job.mentor_id).eq('is_active', true).limit(1).maybeSingle()
        : { data: null, error: null };
      if (assignment.error) throw assignment.error;
      if (!shouldDeliver({ kind: job.event_kind, record: source.data, mentorId: job.mentor_id, mapping: assignment.data })) {
        const { error: finishError } = await client.rpc('finish_mentor_push_job', { job_id: job.id, retry: false });
        if (finishError) throw finishError;
        continue;
      }
      const { data: subscriptions, error: subscriptionError } = await client.from('push_subscriptions').select('id,endpoint,keys').eq('user_id', job.mentor_id);
      if (subscriptionError) throw subscriptionError;
      const result = await deliverJob({
        kind: job.event_kind,
        subscriptions: subscriptions || [],
        send: (subscription: Subscription, payload: string) => webpush.sendNotification(subscription, payload, { TTL: 86400 }),
        remove: async (subscription: Subscription) => {
          const { error: deleteError } = await client.from('push_subscriptions').delete().eq('id', subscription.id);
          if (deleteError) throw deleteError;
        }
      });
      const { error: finishError } = await client.rpc('finish_mentor_push_job', { job_id: job.id, retry: result.retry });
      if (finishError) throw finishError;
    } catch (err) {
      console.error('Notification job failed:', err instanceof Error ? err.message : 'unknown error');
    }
  }
  return Response.json({ processed: jobs?.length || 0 });
});
