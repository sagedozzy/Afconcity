// AfconCity brand bookings through Bachs (https://bachs.io). One Supabase Edge Function, three routes:
//   POST /bachs/checkout  the brands page sends a booking; we price it, save it and return a Bachs checkout link
//   GET  /bachs/status?id= the brands page checks a booking after the brand comes back from paying
//   POST /bachs/webhook   Bachs tells us a payment succeeded (signed with your webhook secret)
// Secrets (Supabase > Edge Functions > Secrets): BACHS_SECRET_KEY, BACHS_WEBHOOK_SECRET
// Optional: BACHS_API (default https://api.bachs.io; use https://sandbox-api.bachs.io to test), BACHS_CURRENCY (default TZS),
//           BACHS_FX (Tanzanian shillings per unit of BACHS_CURRENCY, default 1), SITE_URL (default https://afconcity.com)
// Deploy with "Verify JWT" turned OFF (Bachs cannot send a Supabase token); the checkout route still checks every field itself.
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (k: string, d = '') => Deno.env.get(k) ?? d;
const SITE = env('SITE_URL', 'https://afconcity.com').replace(/\/$/, '');
const API = env('BACHS_API', 'https://api.bachs.io').replace(/\/$/, '');
const CURRENCY = env('BACHS_CURRENCY', 'TZS').toUpperCase();
const FX = Number(env('BACHS_FX', '1')) || 1;
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const cors = { 'Access-Control-Allow-Origin': SITE, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const str = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
const hex = (v: unknown, d: string) => /^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : d;
const PAID = new Set(['paid', 'succeeded', 'success', 'completed', 'complete']);

async function bachs(method: string, path: string, body?: unknown) {
  const r = await fetch(`${API}/${path}`, { method, headers: { Authorization: `Bearer ${env('BACHS_SECRET_KEY')}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data: any = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!r.ok) throw new Error(data.detail || data.message || data.error || `Bachs answered ${r.status}`);
  return data.data && typeof data.data === 'object' && !data.checkout_url ? data.data : data;
}

async function checkout(req: Request) {
  const b = await req.json().catch(() => ({}));
  const slot = str(b.slot, 24), months = Math.round(Number(b.months));
  const start = str(b.start, 10), today = new Date().toISOString().slice(0, 10);
  const booking = {
    slot, months, start_date: start,
    brand: str(b.brand, 40), headline: str(b.headline, 40), sub: str(b.sub, 60),
    c1: hex(b.c1, '#141838'), c2: hex(b.c2, '#232a63'), fg: hex(b.fg, '#ffffff'),
    contact_name: str(b.name, 80), contact_email: str(b.email, 120).toLowerCase(), company: str(b.company, 80),
  };
  if (!booking.brand || !booking.headline || !booking.contact_name) return json({ error: 'Please fill in your brand, headline and name.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(booking.contact_email)) return json({ error: 'Please check your email address.' }, 400);
  if (!(months >= 1 && months <= 12)) return json({ error: 'Choose between 1 and 12 months.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start <= today) return json({ error: 'Choose a start date from tomorrow on.' }, 400);
  if (!b.terms) return json({ error: 'Please accept the advertising terms.' }, 400);
  // the price comes from the owner's rates in the game, never from the browser
  const { data: cfg } = await db.from('docs').select('data').eq('coll', 'config').eq('id', 'ads').maybeSingle();
  const rate = Number(cfg?.data?.rates?.[slot]);
  if (!(rate > 0)) return json({ error: 'That slot is not for sale right now.' }, 400);
  // not over the top of a booking that is already live for those dates
  const { data: live } = await db.from('docs').select('data').eq('coll', 'billboards').eq('id', slot).maybeSingle();
  if (live?.data?.status === 'live' && (!live.data.end || live.data.end >= start)) return json({ error: `That slot is booked${live.data.end ? ' until ' + live.data.end : ''}. Pick a later start date or another slot.` }, 409);
  const tsh = rate * months, amount = Math.max(1, Math.round((tsh / FX) * 100) / 100);
  const { data: row, error } = await db.from('bookings').insert({ ...booking, amount, currency: CURRENCY }).select('id').single();
  if (error || !row) return json({ error: 'Could not save the booking. Please try again.' }, 500);
  const [first, ...rest] = booking.contact_name.split(/\s+/);
  try {
    const s = await bachs('POST', 'v1/checkout-sessions', {
      customer: { email: booking.contact_email, first_name: first || booking.contact_name, last_name: rest.join(' ') || first || booking.contact_name },
      pricing: { amount, currency: CURRENCY },
      success_url: `${SITE}/brands?booking=${row.id}`,
      cancel_url: `${SITE}/brands?cancelled=${row.id}`,
      reference: `booking:${row.id}`,
      metadata: { booking_id: row.id, slot, months: String(months) },
    });
    const id = s.checkout_id || s.id, url = s.checkout_url || s.url;
    if (!url) throw new Error('No checkout link came back.');
    await db.from('bookings').update({ checkout_id: id }).eq('id', row.id);
    return json({ id: row.id, url, amount, currency: CURRENCY, tsh });
  } catch (e) {
    await db.from('bookings').update({ status: 'cancelled', note: `checkout failed: ${String((e as Error).message).slice(0, 200)}` }).eq('id', row.id);
    return json({ error: 'The payment page could not be opened. Please try again in a moment.' }, 502);
  }
}

// after paying, the brand lands back on /brands?booking=<id>; if the webhook has not arrived yet, ask Bachs directly
async function status(url: URL) {
  const id = str(url.searchParams.get('id'), 40);
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'Unknown booking.' }, 400);
  const { data: b } = await db.from('bookings').select('id,status,slot,start_date,months,checkout_id,brand').eq('id', id).maybeSingle();
  if (!b) return json({ error: 'Unknown booking.' }, 404);
  if (b.status === 'pending_payment' && b.checkout_id) {
    try {
      const s = await bachs('GET', `v1/checkout-sessions/${encodeURIComponent(b.checkout_id)}`);
      if (PAID.has(String(s.status || s.payment_status || '').toLowerCase())) { await db.from('bookings').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending_payment'); b.status = 'paid'; }
    } catch { /* the webhook will settle it */ }
  }
  return json({ status: b.status, slot: b.slot, start: b.start_date, months: b.months, brand: b.brand });
}

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((x) => x.toString(16).padStart(2, '0')).join('');
}
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

async function webhook(req: Request) {
  const raw = await req.text(), ts = req.headers.get('x-bachs-timestamp') ?? '', sig = (req.headers.get('x-bachs-signature') ?? '').replace(/^sha256=/, '');
  if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return new Response('stale', { status: 400 });
  if (!same(await hmacHex(env('BACHS_WEBHOOK_SECRET'), `${ts}.${raw}`), sig)) return new Response('bad signature', { status: 401 });
  let ev: any; try { ev = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  if (!ev?.id || !ev?.type) return new Response('bad event', { status: 400 });
  // Bachs may deliver the same event more than once
  const { error: dup } = await db.from('bachs_events').insert({ id: String(ev.id).slice(0, 120), type: String(ev.type).slice(0, 60) });
  if (dup) return new Response('ok');
  const d = ev.data ?? {}, checkoutId = d.checkout_id ?? d.checkout?.id ?? null;
  const ref = String(d.reference ?? d.metadata?.booking_id ?? '').replace(/^booking:/, '');
  const sel = /^[0-9a-f-]{36}$/.test(ref) ? { col: 'id', v: ref } : checkoutId ? { col: 'checkout_id', v: String(checkoutId) } : null;
  if (!sel) return new Response('ok');
  if (ev.type === 'collection.succeeded') await db.from('bookings').update({ status: 'paid', paid_at: new Date().toISOString() }).eq(sel.col, sel.v).eq('status', 'pending_payment');
  else if (ev.type === 'collection.failed' || ev.type === 'collection.underpaid') await db.from('bookings').update({ note: `Bachs: ${ev.type}` }).eq(sel.col, sel.v);
  return new Response('ok');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(req.url), route = url.pathname.split('/').filter(Boolean).pop();
  try {
    if (route === 'checkout' && req.method === 'POST') return await checkout(req);
    if (route === 'status' && req.method === 'GET') return await status(url);
    if (route === 'webhook' && req.method === 'POST') return await webhook(req);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
