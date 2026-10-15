/* AfconCity brands page: reads the slots and prices the owner set in the game, previews the design,
   and sends the booking to the bachs Edge Function, which returns a Bachs payment link. */
(() => {
  // the same public (publishable) key the game uses; the database rules decide what it may read
  const SB = 'https://duwxnxvrrzqiaeortusg.supabase.co', KEY = 'sb_publishable_ViPUHhYZaXfCQk133yMzhA_JLE4Rz_2';
  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  const $ = (s) => document.querySelector(s);
  const tsh = (n) => 'TSh ' + Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const form = $('#bookForm'), msg = $('#msg');
  let rates = {}, slots = [], live = {};
  const say = (t, bad) => { msg.textContent = t; msg.classList.toggle('bad', !!bad); };
  const iso = (d) => d.toISOString().slice(0, 10);

  async function load() {
    try {
      const [c, b] = await Promise.all([
        fetch(`${SB}/rest/v1/docs?coll=eq.config&id=in.(ads,slots)&select=id,data`, { headers: H }).then(r => r.json()),
        fetch(`${SB}/rest/v1/docs?coll=eq.billboards&select=id,data`, { headers: H }).then(r => r.json()),
      ]);
      for (const d of c || []) { if (d.id === 'ads') rates = (d.data && d.data.rates) || {}; if (d.id === 'slots') slots = (d.data && Array.isArray(d.data.list)) ? d.data.list : []; }
      for (const d of b || []) live[d.id] = d.data || {};
    } catch (e) {}
    slots = slots.filter(s => s && s.id && rates[s.id] > 0);
    drawTable(); fillSelect(); price();
  }
  const bookedUntil = (id) => { const a = live[id]; if (!a || a.status !== 'live') return ''; if (!a.end) return 'open-ended'; return a.end >= iso(new Date()) ? a.end : ''; };
  function drawTable() {
    const tb = $('#slotRows'); tb.innerHTML = '';
    if (!slots.length) { tb.innerHTML = '<tr><td colspan="3">Online booking opens soon. Write to <a href="mailto:support@afconcity.com">support@afconcity.com</a> to book now.</td></tr>'; form.hidden = true; return; }
    for (const s of slots) {
      const until = bookedUntil(s.id), tr = document.createElement('tr');
      tr.innerHTML = `<td><b>${esc(s.name)}</b><small>${esc(s.note || '')}</small></td><td><span class="av ${until ? 'busy' : ''}">${until ? (until === 'open-ended' ? 'Booked' : 'Booked until ' + esc(until)) : 'Available'}</span></td><td>${tsh(rates[s.id])}</td>`;
      tb.append(tr);
    }
  }
  function fillSelect() {
    const sel = $('#fSlot'); sel.innerHTML = '';
    for (const s of slots) { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.name} · ${tsh(rates[s.id])} a month`; sel.append(o); }
    const want = new URLSearchParams(location.search).get('slot'); if (want && slots.some(s => s.id === want)) sel.value = want;
    startFloor();
  }
  // the earliest start is tomorrow, or the day after the current booking ends
  function startFloor() {
    const id = $('#fSlot').value, until = bookedUntil(id), t = new Date(); t.setDate(t.getDate() + 1);
    let min = iso(t);
    if (until && until !== 'open-ended') { const d = new Date(until + 'T00:00:00'); d.setDate(d.getDate() + 1); if (iso(d) > min) min = iso(d); }
    const st = $('#fStart'); st.min = min; if (!st.value || st.value < min) st.value = min;
  }
  function price() {
    const id = $('#fSlot').value, m = +$('#fMonths').value || 1, r = rates[id] || 0;
    $('#total').textContent = r ? tsh(r * m) : '–'; $('#totalNote').textContent = r ? `${m} month${m === 1 ? '' : 's'} × ${tsh(r)}` : '';
  }
  function preview() {
    const c = $('#preview'), x = c.getContext('2d'), w = c.width, h = c.height, f = (n) => form.querySelector(`[name=${n}]`).value;
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, f('c1')); g.addColorStop(1, f('c2')); x.fillStyle = g; x.fillRect(0, 0, w, h);
    // kanga border, like the boards in the game
    const k = ['#f3b41b', '#e0553a', '#141838']; for (let i = 0; i < w; i += 36) { x.fillStyle = k[(i / 36) % 3]; x.fillRect(i, 0, 36, 16); x.fillRect(i, h - 16, 36, 16); }
    x.fillStyle = f('fg'); x.textAlign = 'center'; x.textBaseline = 'middle';
    const fit = (t, weight, size, max, fam) => { let s = size; do { x.font = `${weight} ${s}px ${fam}`; s -= 4; } while (x.measureText(t).width > max && s > 20); };
    const brand = f('brand') || 'YOUR BRAND', head = f('headline') || 'YOUR HEADLINE', sub = f('sub');
    fit(brand.toUpperCase(), 800, 46, w - 140, 'Figtree, sans-serif'); x.globalAlpha = 0.85; x.fillText(brand.toUpperCase(), w / 2, 110); x.globalAlpha = 1;
    fit(head, 900, 150, w - 110, '"Big Shoulders Display", Impact, sans-serif'); x.fillText(head, w / 2, h / 2 + 6);
    if (sub) { fit(sub, 600, 40, w - 160, 'Figtree, sans-serif'); x.fillText(sub, w / 2, h - 96); }
  }
  form.addEventListener('input', () => { price(); preview(); });
  $('#fSlot').addEventListener('change', () => { startFloor(); price(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = (n) => form.querySelector(`[name=${n}]`), body = {};
    for (const n of ['slot', 'start', 'months', 'brand', 'headline', 'sub', 'c1', 'c2', 'fg', 'name', 'email', 'company']) body[n] = f(n).value.trim();
    body.months = +body.months; body.terms = f('terms').checked;
    if (!body.brand || !body.headline || !body.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) { say('Please fill in the brand, headline, your name and a valid email.', true); return; }
    if (!body.terms) { say('Please accept the advertising terms.', true); return; }
    const btn = $('#pay'); btn.disabled = true; say('Opening the secure payment page…');
    try {
      const r = await fetch(`${SB}/functions/v1/bachs/checkout`, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { say(j.error || 'Payments are not switched on yet. Please write to support@afconcity.com to book.', true); btn.disabled = false; return; }
      try { sessionStorage.setItem('afc-booking', JSON.stringify({ id: j.id, design: body })); } catch (err) {}
      location.href = j.url;
    } catch (err) { say('Could not reach the booking service. Check your connection and try again.', true); btn.disabled = false; }
  });
  // coming back from Bachs
  async function returned() {
    const q = new URLSearchParams(location.search), id = q.get('booking'), cancelled = q.get('cancelled'), box = $('#state');
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem('afc-booking') || 'null'); } catch (e) {}
    if (cancelled) {
      box.hidden = false; box.className = 'card state warn'; box.innerHTML = '<h2>Payment cancelled</h2><p>Nothing was charged. Your design is still filled in below, so you can try again.</p>';
      if (saved && saved.design) for (const [k, v] of Object.entries(saved.design)) { const el = form.querySelector(`[name=${k}]`); if (el && el.type !== 'checkbox') el.value = v; }
      preview(); price(); return;
    }
    if (!id) return;
    box.hidden = false; box.className = 'card state'; box.innerHTML = '<h2>Checking your payment…</h2>';
    for (let i = 0; i < 8; i++) {
      try {
        const j = await fetch(`${SB}/functions/v1/bachs/status?id=${encodeURIComponent(id)}`, { headers: H }).then(r => r.json());
        if (j.status === 'paid' || j.status === 'approved') { box.innerHTML = `<h2>Asante! Payment received</h2><p>Your booking for <b>${esc(j.brand || '')}</b> is in. We check the design within one working day, and it goes live on <b>${esc(j.start)}</b> for ${j.months} month${j.months === 1 ? '' : 's'}. Your reference: <b>${esc(id.slice(0, 8).toUpperCase())}</b>.</p>`; return; }
        if (j.status && j.status !== 'pending_payment') { box.className = 'card state warn'; box.innerHTML = `<h2>Booking ${esc(j.status)}</h2><p>Questions? Write to <a href="mailto:support@afconcity.com">support@afconcity.com</a> with reference ${esc(id.slice(0, 8).toUpperCase())}.</p>`; return; }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 2500));
    }
    box.className = 'card state warn'; box.innerHTML = `<h2>Payment still processing</h2><p>Bachs has not confirmed your payment yet. This page will not charge you twice. If it does not clear within an hour, write to <a href="mailto:support@afconcity.com">support@afconcity.com</a> with reference <b>${esc(id.slice(0, 8).toUpperCase())}</b>.</p>`;
  }
  preview(); load(); returned();
  if (document.fonts) document.fonts.ready.then(preview);
})();
