/* ===================== 64 owner tools on afconcity.com: paid brand bookings to approve, and player analytics ===================== */
/* The brands page (afconcity.com/brands) needs the list of slots, which only exists inside the game: the owner's game publishes it. */
async function publishSlots() {
  if (!AD.db || !AD.canEdit) return;
  const list = allSlots().map(s => ({ id: s.id, name: s.name, note: String(s.note || '').slice(0, 200), kind: s.kind || '' }));
  const key = JSON.stringify(list); if (key === AD.slotsKey) return;
  // remember it before writing: the write comes back as a change to config, which redraws this panel
  AD.slotsKey = key;
  try { await AD.db.doc('config/slots').set({ list, at: Date.now() }); } catch (e) { AD.slotsKey = ''; }
}
const addMonths = (iso, m) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + m); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
function ownerBookings() {
  const box = el('section', 'ad-insights');
  box.append(el('h3', '', 'Brand bookings (afconcity.com/brands)'));
  const p = el('p', 'fine', 'Loading bookings…'); box.append(p);
  const ul = el('ul', 'jobs bookings'); box.append(ul);
  const draw = async () => {
    try {
      const { data, error } = await WEB.sb.from('bookings').select('*').in('status', ['paid', 'pending_payment', 'approved', 'declined']).order('created_at', { ascending: false }).limit(40);
      if (error) throw error;
      ul.innerHTML = '';
      const paid = (data || []).filter(b => b.status === 'paid');
      p.textContent = data && data.length ? `${paid.length} paid and waiting for you. Approving puts the design live on its start date; declining means you refund it in your Bachs dashboard.` : 'No bookings yet. Brands book and pay at afconcity.com/brands once you set prices above (Prices per month) and turn on Bachs.';
      for (const b of data || []) {
        if (b.status === 'pending_payment' && Date.now() - Date.parse(b.created_at) > 2 * 86400000) continue;
        const slot = allSlots().find(s => s.id === b.slot), li = el('li', 'bk-' + b.status);
        li.append(el('b', '', `${b.brand} · ${slot ? slot.name : b.slot}`), el('span', '', `${b.headline}${b.sub ? ' · ' + b.sub : ''} · from ${b.start_date} for ${b.months} month${b.months === 1 ? '' : 's'} · ${b.amount.toLocaleString()} ${b.currency} · ${b.contact_name} <${b.contact_email}> · ${b.status.replace('_', ' ')}${b.note ? ' · ' + b.note : ''}`));
        if (b.status === 'paid') {
          const ok = el('button', 'btn btn-sm', 'Approve'), no = el('button', 'btn btn-sm btn-ghost', 'Decline'); ok.type = no.type = 'button';
          ok.addEventListener('click', async () => {
            ok.disabled = no.disabled = true;
            try {
              await AD.db.doc('billboards/' + b.slot).set({ brand: b.brand, headline: b.headline, sub: b.sub, c1: b.c1, c2: b.c2, fg: b.fg, start: b.start_date, end: addMonths(b.start_date, b.months), status: 'live', booking: b.id, updatedAt: Date.now() });
              await WEB.sb.from('bookings').update({ status: 'approved' }).eq('id', b.id); sfx.ding(); draw();
            } catch (e) { ok.disabled = no.disabled = false; note('Could not approve it. Try again.'); }
          });
          no.addEventListener('click', async () => { ok.disabled = no.disabled = true; try { await WEB.sb.from('bookings').update({ status: 'declined', note: 'refund in Bachs' }).eq('id', b.id); draw(); } catch (e) { ok.disabled = no.disabled = false; } });
          li.append(ok, no);
        }
        ul.append(li);
      }
    } catch (e) { p.textContent = 'Could not load bookings. Run the latest supabase/setup.sql, then reload.'; }
  };
  draw();
  return box;
}
/* players, sessions, the path from first visit to VIP ticket, where players come from */
function ownerAnalytics() {
  const box = el('section', 'ad-insights an');
  box.append(el('h3', '', 'Players · last 14 days'));
  const p = el('p', 'fine', 'Loading analytics…'); box.append(p);
  (async () => {
    try {
      const { data: A, error } = await WEB.sb.rpc('analytics_summary', { p_days: 14 });
      if (error) throw error;
      p.textContent = 'Counted from anonymous play events on afconcity.com. Events are kept 90 days.';
      const pct = (a, b) => b ? Math.round(a * 100 / b) + '%' : '–';
      const tiles = el('div', 'an-tiles');
      for (const [v, l] of [[A.players, 'players'], [A.new_players, 'new players'], [pct(A.returned_next_day, A.new_players), 'came back next day'], [pct(A.returned_within_7_days, A.new_players), 'came back within 7 days'], [`${A.avg_session_min} min`, 'average visit'], [A.invites, 'friends invited'], [A.saves, 'cloud saves used']]) { const d = el('div'); d.append(el('b', '', String(v)), el('span', '', l)); tiles.append(d); }
      box.append(tiles);
      // daily players as bars
      const max = Math.max(1, ...A.daily.map(d => d.players));
      const bars = el('div', 'an-bars'); bars.setAttribute('role', 'img'); bars.setAttribute('aria-label', 'Players per day: ' + A.daily.map(d => `${d.day} ${d.players}`).join(', '));
      for (const d of A.daily) { const c = el('div'); const i = el('i'); i.style.height = Math.round(d.players / max * 100) + '%'; c.title = `${d.day}: ${d.players} players, ${d.sessions} visits, ${d.minutes} min`; c.append(i, el('small', '', d.day.slice(8))); bars.append(c); }
      box.append(el('h4', '', 'Players per day'), bars);
      const names = { session_start: 'Opened the game', play: 'Pressed Play', onboard_done: 'Answered the questions', met_amina: 'Met Amina', first_job: 'Finished a job', stamps_3: '3 passport stamps', stamps_all: 'Full passport', vip_ticket: 'Bought the VIP ticket' };
      const top = Math.max(1, A.funnel[0] ? A.funnel[0].players : 1), fl = el('ul', 'an-funnel');
      for (const f of A.funnel) { const li = el('li'); const i = el('i'); i.style.width = Math.round(f.players / top * 100) + '%'; li.append(el('span', '', names[f.step] || f.step), el('b', '', `${f.players} · ${pct(f.players, top)}`), i); fl.append(li); }
      box.append(el('h4', '', 'From first visit to VIP ticket'), fl);
      const two = el('div', 'an-two'), list = (title, rows, key) => { const s = el('div'); s.append(el('h4', '', title)); const ul = el('ul', 'jobs'); if (!rows.length) ul.append(el('li', '', 'Nothing yet.')); for (const r of rows) { const li = el('li'); li.append(el('b', '', r[key]), el('span', '', `${r.players} players`)); ul.append(li); } s.append(ul); return s; };
      two.append(list('Where players come from', A.sources, 'source'), list('Devices', A.devices, 'device'));
      box.append(two, el('p', 'fine', 'Tip: add ?utm_source=whatsapp (or tiktok, instagram…) to links you share, to see which channel brings players.'));
    } catch (e) { p.textContent = 'Could not load analytics. Run the latest supabase/setup.sql, then reload.'; }
  })();
  return box;
}
