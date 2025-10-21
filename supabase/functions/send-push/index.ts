import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { WebPush } from 'https://deno.land/x/webpush@1.4.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('Missing VAPID keys.');
}

const webPush =
  vapidPublicKey && vapidPrivateKey
    ? new WebPush({
        subject: vapidSubject,
        publicKey: vapidPublicKey,
        privateKey: vapidPrivateKey
      })
    : null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const subscription = payload?.subscription;
    const message = payload?.message ?? {};

    if (!subscription) {
      return new Response(JSON.stringify({ error: 'Missing subscription.' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (!webPush) {
      return new Response(JSON.stringify({ error: 'Server is not configured for Web Push.' }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    await delay(30_000);

    await webPush.sendNotification(subscription, JSON.stringify({
      title: message.title ?? '30초가 지났어요 ⏰',
      body: message.body ?? '요청하신 지 30초가 지났습니다.'
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to send push notification.' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
