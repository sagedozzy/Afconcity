-- AfconCity Quest: Supabase setup. Paste the whole file into the SQL Editor and click Run.
-- Safe to run again: it only creates what is missing and replaces the functions and policies.

-- ============ who is the owner ============
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('support@afconcity.com') on conflict do nothing;
alter table public.admins enable row level security;
-- nobody reads or writes this list through the website; edit it here in the dashboard

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.admins a where a.email = lower(auth.jwt() ->> 'email'));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ============ shared game data: ad bookings, settings, player stats, feedback, reports ============
-- one row per document, addressed like a path: coll = 'billboards', id = 'b1'
create table if not exists public.docs (
  coll text not null,
  id text not null,
  owner uuid default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (coll, id),
  constraint docs_size check (octet_length(data::text) < 400000)
);
create index if not exists docs_coll_updated on public.docs (coll, updated_at desc);
alter table public.docs enable row level security;

create or replace function public.docs_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.docs_touch();

-- a player's own rows: their stats, their feedback, their reports (small, and not too many)
create or replace function public.docs_player_ok(c text, i text, o uuid, d jsonb) returns boolean
language sql stable as $$
  select auth.uid() is not null and o = auth.uid() and octet_length(d::text) < 8000 and (
       (c = 'stats' and i = auth.uid()::text)
    or (c = 'feedback' and i = auth.uid()::text)
    or (c = 'feedback/' || auth.uid()::text || '/items')
    or (c = 'reports')
  );
$$;

drop policy if exists docs_read on public.docs;
create policy docs_read on public.docs for select to anon, authenticated
  using (coll in ('billboards', 'config') or public.is_admin() or owner = auth.uid());
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert to authenticated
  with check (public.is_admin() or public.docs_player_ok(coll, id, owner, data));
drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update to authenticated
  using (public.is_admin() or owner = auth.uid())
  with check (public.is_admin() or public.docs_player_ok(coll, id, owner, data));
drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs for delete to authenticated using (public.is_admin());

-- limit feedback and reports per player per day
create or replace function public.docs_limits() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if (new.coll like 'feedback/%/items' or new.coll = 'reports') and
     (select count(*) from public.docs where owner = new.owner and (coll = new.coll) and updated_at > now() - interval '1 day') >= 20 then
    raise exception 'Too many messages today. Try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists docs_limits on public.docs;
create trigger docs_limits before insert on public.docs for each row execute function public.docs_limits();

-- ============ chat: filtered, rate limited, bannable, and the owner can switch it off ============
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  owner uuid not null default auth.uid(),
  nick text not null default 'Fan',
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_len check (char_length(body) between 1 and 90 and char_length(nick) between 1 and 16)
);
create index if not exists chat_recent on public.chat_messages (created_at desc);
create index if not exists chat_owner on public.chat_messages (owner, created_at desc);
alter table public.chat_messages enable row level security;

create table if not exists public.chat_bans (uid uuid primary key, reason text, created_at timestamptz not null default now());
alter table public.chat_bans enable row level security;
drop policy if exists bans_admin on public.chat_bans;
create policy bans_admin on public.chat_bans for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.chat_words (word text primary key);
alter table public.chat_words enable row level security;
insert into public.chat_words (word) values
  ('fuck'), ('fucking'), ('fucker'), ('fucked'), ('motherfucker'), ('shit'), ('shitty'), ('bitch'), ('bitches'), ('cunt'), ('dick'), ('pussy'), ('asshole'), ('bastard'), ('whore'), ('slut'),
  ('nigga'), ('niggas'), ('nigger'), ('faggot'), ('retard'),
  ('malaya'), ('kuma'), ('msenge'), ('mkundu'), ('kumamako'), ('kumamayo'), ('mboro')
on conflict do nothing;

create or replace function public.chat_enabled() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (data ->> 'chat')::boolean from public.docs where coll = 'config' and id = 'chat'), true);
$$;

create table if not exists public.chat_phrases (phrase text primary key);
alter table public.chat_phrases enable row level security;
delete from public.chat_phrases;
insert into public.chat_phrases (phrase) values
  ('Mambo! 👋'), ('Poa!'), ('Karibu Fumba!'), ('Twende!'), ('Asante!'), ('GG!'), ('Nice look! 🔥'), ('Race me?'), ('Follow me'), ('Wait for me'), ('Let''s do a job'), ('Goal! ⚽'), ('Haha 😂'), ('Need cash 😅'), ('See you later! 👋') on conflict do nothing;

create or replace function public.chat_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare w text;
begin
  if not public.chat_enabled() and not public.is_admin() then raise exception 'Chat is switched off right now.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.chat_bans b where b.uid = new.owner) then raise exception 'You cannot chat in AfconCity.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.chat_messages m where m.owner = new.owner and m.created_at > now() - interval '1500 milliseconds') then
    raise exception 'Slow down a little.' using errcode = 'P0001'; end if;
  if (select count(*) from public.chat_messages m where m.owner = new.owner and m.created_at > now() - interval '1 minute') >= 12 then
    raise exception 'Too many messages. Wait a minute.' using errcode = 'P0001'; end if;
  new.body := btrim(regexp_replace(new.body, '[[:cntrl:]]', '', 'g'));
  new.nick := btrim(regexp_replace(new.nick, '[[:cntrl:]]', '', 'g'));
  -- players who said they are under 18 may only send the game's quick phrases
  if exists (select 1 from public.docs d where d.coll = 'stats' and d.id = new.owner::text and d.data->'about'->>'age' = 'Under 18')
     and not exists (select 1 from public.chat_phrases p where p.phrase = new.body) then
    raise exception 'Pick one of the quick phrases.' using errcode = 'P0001'; end if;
  for w in select word from public.chat_words loop
    -- whole words only, so everyday words that merely start the same way (kumaliza) are left alone
    new.body := regexp_replace(new.body, '\m' || w || '\M', '***', 'gi');
    new.nick := regexp_replace(new.nick, '\m' || w || '\M', 'Fan', 'gi');
  end loop;
  if new.nick = '' then new.nick := 'Fan'; end if;
  if to_regclass('public.nicknames') is not null and exists (select 1 from public.nicknames x where x.key = lower(regexp_replace(new.nick, '[^A-Za-z0-9]', '', 'g')) and x.uid <> new.owner) then new.nick := 'Fan'; end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists chat_guard on public.chat_messages;
create trigger chat_guard before insert on public.chat_messages for each row execute function public.chat_guard();

drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages for select to anon, authenticated
  using (created_at > now() - interval '15 minutes' or public.is_admin());
drop policy if exists chat_write on public.chat_messages;
create policy chat_write on public.chat_messages for insert to authenticated with check (owner = auth.uid());
drop policy if exists chat_delete on public.chat_messages;
create policy chat_delete on public.chat_messages for delete to authenticated using (public.is_admin());

-- ============ access for the website's public key (rows are still guarded by the policies above) ============
grant usage on schema public to anon, authenticated;
grant select on public.docs, public.chat_messages to anon, authenticated;
grant insert, update, delete on public.docs to authenticated;
grant insert, delete on public.chat_messages to authenticated;
grant select, insert, delete on public.chat_bans to authenticated;

-- ============ live updates for ad bookings and chat ============
do $$ begin
  begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; end;
end $$;

-- =====================================================================================================
-- Version 2 (October 2026): cloud saves, leaderboards, invites, analytics, brand bookings, clean-up
-- =====================================================================================================

-- ============ cloud saves: the game shows a code; typing it on another phone moves the save there ============
create table if not exists public.saves (
  code text primary key,
  owner uuid not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint save_code check (code ~ '^[A-HJ-NP-Z2-9]{10}$'),
  constraint save_size check (octet_length(data::text) < 60000)
);
create index if not exists saves_owner on public.saves (owner);
alter table public.saves enable row level security;  -- no policies: only the functions below read or write saves
create table if not exists public.save_tries (uid uuid not null, at timestamptz not null default now());
create index if not exists save_tries_uid on public.save_tries (uid, at desc);
alter table public.save_tries enable row level security;

create or replace function public.save_put(p_code text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); o uuid; a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if p_data is null or octet_length(p_data::text) >= 60000 then raise exception 'This save is too big.' using errcode = 'P0001'; end if;
  if c = '' then
    if (select count(*) from saves where owner = auth.uid()) >= 5 then raise exception 'Too many save codes on this device.' using errcode = 'P0001'; end if;
    loop
      c := ''; for i in 1..10 loop c := c || substr(a, 1 + floor(random() * 32)::int, 1); end loop;
      exit when not exists (select 1 from saves where code = c);
    end loop;
    insert into saves (code, owner, data) values (c, auth.uid(), p_data);
    return c;
  end if;
  select owner into o from saves where code = c;
  if o is null then raise exception 'Unknown save code.' using errcode = 'P0001'; end if;
  if o <> auth.uid() then raise exception 'This save moved to another device.' using errcode = 'P0001'; end if;
  update saves set data = p_data, updated_at = now() where code = c;
  return c;
end $$;

create or replace function public.save_load(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); r public.saves;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if (select count(*) from save_tries where uid = auth.uid() and at > now() - interval '1 hour') >= 20 then raise exception 'Too many tries. Wait an hour and try again.' using errcode = 'P0001'; end if;
  insert into save_tries (uid) values (auth.uid());
  select * into r from saves where code = c;
  if r.code is null then raise exception 'No save has that code. Check it and try again.' using errcode = 'P0001'; end if;
  update saves set owner = auth.uid(), updated_at = now() where code = c;  -- this device continues the save
  if r.owner <> auth.uid() and to_regprocedure('public.nyota_move(uuid,uuid)') is not null then
    execute 'select public.nyota_move($1, $2)' using r.owner, auth.uid();  -- Nyota and premium items travel with the save
  end if;
  if r.owner <> auth.uid() and to_regprocedure('public.nick_move(uuid,uuid)') is not null then
    execute 'select public.nick_move($1, $2)' using r.owner, auth.uid();  -- and so does a locked-in fan name
  end if;
  return jsonb_build_object('code', r.code, 'data', r.data, 'updated_at', r.updated_at);
end $$;
revoke execute on function public.save_put(text, jsonb), public.save_load(text) from public, anon;
grant execute on function public.save_put(text, jsonb), public.save_load(text) to authenticated;

-- ============ leaderboards: everyone can read; each player writes only their own row, within sane limits ============
create table if not exists public.scores (
  uid uuid primary key default auth.uid(),
  nick text not null default 'Fan',
  worth bigint not null default 0,          -- cash plus Pesa
  stamps int not null default 0,
  week text not null default '',            -- ISO week of the weekly numbers, like 2026-W42
  week_stamps int not null default 0,
  week_earned bigint not null default 0,
  best_race int,                            -- bajaji race, milliseconds
  ref text unique,                          -- invite code
  updated_at timestamptz not null default now(),
  constraint scores_sane check (char_length(nick) between 1 and 16 and worth between 0 and 100000000 and stamps between 0 and 30
    and week_stamps between 0 and 30 and week_earned between 0 and 100000000 and (best_race is null or best_race between 20000 and 3600000)
    and (ref is null or ref ~ '^[a-z0-9]{6}$'))
);
create index if not exists scores_worth on public.scores (worth desc);
create index if not exists scores_week on public.scores (week, week_stamps desc, week_earned desc);
alter table public.scores enable row level security;
create or replace function public.scores_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare w text;
begin
  if not public.is_admin() and coalesce(current_setting('afc.ref_ok', true), '') <> '1' then
    if tg_op = 'UPDATE' and old.updated_at > now() - interval '10 seconds' then raise exception 'Too often.' using errcode = 'P0001'; end if;
    if tg_op = 'UPDATE' then new.ref := old.ref; else new.ref := null; end if;  -- invite codes are handed out by my_ref()
  end if;
  new.nick := btrim(regexp_replace(new.nick, '[[:cntrl:]]', '', 'g'));
  for w in select word from public.chat_words loop new.nick := regexp_replace(new.nick, '\m' || w || '\M', 'Fan', 'gi'); end loop;
  if new.nick = '' then new.nick := 'Fan'; end if;
  -- a name another player has locked in shows as Fan
  if to_regclass('public.nicknames') is not null and exists (select 1 from public.nicknames x where x.key = lower(regexp_replace(new.nick, '[^A-Za-z0-9]', '', 'g')) and x.uid <> new.uid) then new.nick := 'Fan'; end if;
  if exists (select 1 from public.chat_bans b where b.uid = new.uid) then new.nick := 'Fan'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists scores_guard on public.scores;
create trigger scores_guard before insert or update on public.scores for each row execute function public.scores_guard();
drop policy if exists scores_read on public.scores;
create policy scores_read on public.scores for select to anon, authenticated using (true);
drop policy if exists scores_insert on public.scores;
create policy scores_insert on public.scores for insert to authenticated with check (uid = auth.uid());
drop policy if exists scores_update on public.scores;
create policy scores_update on public.scores for update to authenticated using (uid = auth.uid() or public.is_admin()) with check (uid = auth.uid() or public.is_admin());
drop policy if exists scores_delete on public.scores;
create policy scores_delete on public.scores for delete to authenticated using (public.is_admin());
grant select on public.scores to anon, authenticated;
grant insert, update, delete on public.scores to authenticated;

-- ============ invites: afconcity.com/?ref=code pays both players once the new player gets going ============
create or replace function public.my_ref() returns text
language plpgsql security definer set search_path = public as $$
declare r text; a text := 'abcdefghjkmnpqrstuvwxyz23456789'; i int;
begin
  if auth.uid() is null then return null; end if;
  select ref into r from scores where uid = auth.uid();
  if r is not null then return r; end if;
  loop
    r := ''; for i in 1..6 loop r := r || substr(a, 1 + floor(random() * 31)::int, 1); end loop;
    exit when not exists (select 1 from scores where ref = r);
  end loop;
  perform set_config('afc.ref_ok', '1', true);
  insert into scores (uid, ref) values (auth.uid(), r) on conflict (uid) do update set ref = r;
  perform set_config('afc.ref_ok', '', true);
  return r;
end $$;
create table if not exists public.invites (
  invitee uuid primary key,
  inviter uuid not null,
  created_at timestamptz not null default now(),
  qualified boolean not null default false,
  paid_invitee boolean not null default false,
  paid_inviter boolean not null default false
);
create index if not exists invites_inviter on public.invites (inviter);
alter table public.invites enable row level security;  -- only the functions below
create or replace function public.invite_accept(p_ref text) returns boolean
language plpgsql security definer set search_path = public as $$
declare inv uuid;
begin
  if auth.uid() is null then return false; end if;
  select uid into inv from scores where ref = lower(p_ref);
  if inv is null or inv = auth.uid() then return false; end if;
  if exists (select 1 from invites where invitee = auth.uid()) then return false; end if;
  if (select count(*) from invites where inviter = inv and created_at > now() - interval '7 days') >= 10 then return false; end if;
  insert into invites (invitee, inviter) values (auth.uid(), inv);
  return true;
end $$;
-- the new player has started properly (met Amina and played a few minutes): their reward, once
create or replace function public.invite_qualify() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update invites set qualified = true, paid_invitee = true where invitee = auth.uid() and not paid_invitee and created_at < now() - interval '3 minutes';
  return found;
end $$;
-- the inviter collects one reward per friend who got going
create or replace function public.invite_collect() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (update invites set paid_inviter = true where inviter = auth.uid() and qualified and not paid_inviter returning 1) select count(*) into n from x;
  return n;
end $$;
revoke execute on function public.my_ref(), public.invite_accept(text), public.invite_qualify(), public.invite_collect() from public, anon;
grant execute on function public.my_ref(), public.invite_accept(text), public.invite_qualify(), public.invite_collect() to authenticated;

-- ============ analytics: small events, kept 90 days, read only by the owner (as totals) ============
create table if not exists public.events (
  id bigint generated always as identity primary key,
  uid uuid not null default auth.uid(),
  sid text not null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  constraint events_sane check (name ~ '^[a-z0-9_]{2,32}$' and char_length(sid) between 4 and 40 and octet_length(props::text) < 1000)
);
create index if not exists events_at on public.events (at);
create index if not exists events_uid on public.events (uid, at);
alter table public.events enable row level security;
create or replace function public.events_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.events e where e.uid = new.uid and e.at > now() - interval '1 day') >= 500 then return null; end if;  -- quietly drop floods
  new.at := now();
  if random() < 0.002 then delete from public.events where at < now() - interval '90 days'; end if;
  return new;
end $$;
drop trigger if exists events_guard on public.events;
create trigger events_guard before insert on public.events for each row execute function public.events_guard();
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated with check (uid = auth.uid());
drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated using (public.is_admin());
grant insert on public.events to authenticated;
grant select on public.events to authenticated;

create or replace function public.analytics_summary(p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d int := least(greatest(coalesce(p_days, 14), 1), 90); since timestamptz := date_trunc('day', now()) - (d - 1) * interval '1 day'; out jsonb;
begin
  if not public.is_admin() then raise exception 'Owners only.' using errcode = 'P0001'; end if;
  with e as (select * from events where at >= since),
  days as (select generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') as day),
  daily as (
    select to_char(days.day, 'YYYY-MM-DD') as day,
      (select count(distinct uid) from e where e.name = 'session_start' and date_trunc('day', e.at) = days.day) as players,
      (select count(*) from e where e.name = 'session_start' and date_trunc('day', e.at) = days.day) as sessions,
      (select coalesce(round(sum(least((e.props->>'sec')::numeric, 14400)) / 60), 0) from e where e.name = 'session_end' and (e.props->>'sec') ~ '^[0-9]+(\.[0-9]+)?$' and date_trunc('day', e.at) = days.day) as minutes
    from days order by days.day),
  firsts as (select uid, min(date_trunc('day', at)) as d0 from events where name = 'session_start' group by uid),
  cohort as (select f.uid, f.d0 from firsts f where f.d0 >= since),
  ret as (select
      count(*) as n,
      count(*) filter (where exists (select 1 from events x where x.uid = c.uid and x.name = 'session_start' and date_trunc('day', x.at) = c.d0 + interval '1 day')) as d1,
      count(*) filter (where exists (select 1 from events x where x.uid = c.uid and x.name = 'session_start' and date_trunc('day', x.at) between c.d0 + interval '1 day' and c.d0 + interval '7 days')) as d7
    from cohort c)
  select jsonb_build_object(
    'days', d,
    'daily', (select coalesce(jsonb_agg(daily), '[]'::jsonb) from daily),
    'players', (select count(distinct uid) from e where name = 'session_start'),
    'new_players', (select n from ret),
    'returned_next_day', (select d1 from ret),
    'returned_within_7_days', (select d7 from ret),
    'avg_session_min', (select coalesce(round(sum(least((props->>'sec')::numeric, 14400)) / nullif(count(distinct sid), 0) / 60, 1), 0) from e where name = 'session_end' and (props->>'sec') ~ '^[0-9]+(\.[0-9]+)?$'),
    'funnel', (select jsonb_agg(jsonb_build_object('step', s.step, 'players', (select count(distinct uid) from e where e.name = s.step)) order by s.ord)
               from (values (1, 'session_start'), (2, 'play'), (3, 'onboard_done'), (4, 'met_amina'), (5, 'first_job'), (6, 'stamps_3'), (7, 'stamps_all'), (8, 'vip_ticket')) as s(ord, step)),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', src, 'players', n) order by n desc), '[]'::jsonb) from (select coalesce(nullif(props->>'src', ''), 'direct') as src, count(distinct uid) as n from e where name = 'session_start' group by 1 order by 2 desc limit 10) q),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', dev, 'players', n) order by n desc), '[]'::jsonb) from (select coalesce(props->>'dev', '?') as dev, count(distinct uid) as n from e where name = 'session_start' group by 1) q),
    'invites', (select count(*) from invites where created_at >= since),
    'saves', (select count(*) from saves where updated_at >= since)
  ) into out;
  return out;
end $$;
revoke execute on function public.analytics_summary(int) from public, anon;
grant execute on function public.analytics_summary(int) to authenticated;

-- ============ brand bookings: created by the bachs-checkout Edge Function, paid through Bachs, approved by the owner ============
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slot text not null,
  months int not null check (months between 1 and 12),
  start_date date not null,
  brand text not null check (char_length(brand) between 1 and 40),
  headline text not null check (char_length(headline) between 1 and 40),
  sub text not null default '' check (char_length(sub) <= 60),
  c1 text not null default '#141838', c2 text not null default '#232a63', fg text not null default '#ffffff',
  contact_name text not null check (char_length(contact_name) between 1 and 80),
  contact_email text not null check (contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(contact_email) <= 120),
  company text not null default '' check (char_length(company) <= 80),
  amount numeric not null,
  currency text not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'approved', 'declined', 'refunded', 'cancelled')),
  checkout_id text,
  paid_at timestamptz,
  note text not null default ''
);
create index if not exists bookings_status on public.bookings (status, created_at desc);
alter table public.bookings enable row level security;
drop policy if exists bookings_owner on public.bookings;
create policy bookings_owner on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update on public.bookings to authenticated;
create table if not exists public.bachs_events (id text primary key, type text, received_at timestamptz not null default now());
alter table public.bachs_events enable row level security;

-- ============ clean-up, as promised on afconcity.com/privacy ============
create or replace function public.afc_cleanup() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from chat_messages where created_at < now() - interval '30 days';
  delete from events where at < now() - interval '90 days';
  delete from save_tries where at < now() - interval '2 days';
  delete from saves where updated_at < now() - interval '12 months';
  delete from scores where updated_at < now() - interval '12 months';
  delete from docs where (coll = 'stats' or coll = 'reports' or coll like 'feedback%') and updated_at < now() - interval '12 months';
end $$;
revoke execute on function public.afc_cleanup() from public, anon, authenticated;
-- every night at 03:17 UTC, if the pg_cron extension is available (Database > Extensions); chat also tidies itself as it goes
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('afc-cleanup', '17 3 * * *', 'select public.afc_cleanup()');
exception when others then raise notice 'Nightly clean-up not scheduled (%). Turn on pg_cron under Database > Extensions and run this file again.', sqlerrm;
end $$;
create or replace function public.chat_tidy() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if random() < 0.02 then delete from chat_messages where created_at < now() - interval '30 days'; end if;
  return null;
end $$;
drop trigger if exists chat_tidy on public.chat_messages;
create trigger chat_tidy after insert on public.chat_messages for each statement execute function public.chat_tidy();

do $$ begin
  begin alter publication supabase_realtime add table public.scores; exception when duplicate_object then null; end;
end $$;

-- =====================================================================================================
-- Version 3 (October 2026): Nyota, the premium coins bought with Bachs
-- Nyota buy cosmetics and conveniences only. They are never turned into game shillings or real money.
-- Balances change only inside the functions below; a top-up is credited by the bachs Edge Function after Bachs confirms payment.
-- =====================================================================================================
create table if not exists public.wallets (
  uid uuid primary key,
  nyota int not null default 0 check (nyota >= 0),
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
drop policy if exists wallets_read on public.wallets;
create policy wallets_read on public.wallets for select to authenticated using (uid = auth.uid() or public.is_admin());

create table if not exists public.wallet_ledger (
  id bigserial primary key,
  uid uuid not null,
  delta int not null,
  reason text not null check (reason in ('topup', 'buy', 'refund', 'move_in', 'move_out', 'gift')),
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_uid on public.wallet_ledger (uid, created_at desc);
alter table public.wallet_ledger enable row level security;
drop policy if exists ledger_read on public.wallet_ledger;
create policy ledger_read on public.wallet_ledger for select to authenticated using (uid = auth.uid() or public.is_admin());

-- what Nyota buy (days: how long a timed item lasts; empty = forever). Prices can be changed here in the dashboard.
create table if not exists public.nyota_items (
  id text primary key,
  name text not null,
  price int not null check (price > 0),
  days int check (days is null or days > 0),
  active boolean not null default true
);
alter table public.nyota_items enable row level security;
drop policy if exists nyota_items_read on public.nyota_items;
create policy nyota_items_read on public.nyota_items for select to anon, authenticated using (true);
insert into public.nyota_items (id, name, price, days) values
  ('paint_gold', 'Gold paint for your vehicles', 300, null),
  ('paint_pearl', 'Pearl white paint for your vehicles', 200, null),
  ('paint_neon', 'Neon green paint for your vehicles', 200, null),
  ('tag_gold', 'Golden name tag, seen by everyone online', 400, null),
  ('fx_fireworks', 'Fireworks you can set off anywhere', 250, null),
  ('pass_collect', 'Collect your business earnings from your phone, for 7 days', 150, 7)
on conflict (id) do nothing;

-- top-up packs, priced in Tanzanian shillings
create table if not exists public.nyota_packs (
  id text primary key,
  nyota int not null check (nyota > 0),
  price int not null check (price > 0),
  active boolean not null default true
);
alter table public.nyota_packs enable row level security;
drop policy if exists nyota_packs_read on public.nyota_packs;
create policy nyota_packs_read on public.nyota_packs for select to anon, authenticated using (true);
insert into public.nyota_packs (id, nyota, price) values
  ('p100', 100, 2000), ('p550', 550, 10000), ('p1200', 1200, 20000), ('p3200', 3200, 50000)
on conflict (id) do nothing;

create table if not exists public.nyota_owned (
  uid uuid not null,
  item text not null references public.nyota_items (id),
  until timestamptz,
  bought_at timestamptz not null default now(),
  primary key (uid, item)
);
alter table public.nyota_owned enable row level security;
drop policy if exists nyota_owned_read on public.nyota_owned;
create policy nyota_owned_read on public.nyota_owned for select to authenticated using (uid = auth.uid() or public.is_admin());

-- one row per top-up checkout, created and settled by the bachs Edge Function
create table if not exists public.topups (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null,
  pack text not null references public.nyota_packs (id),
  nyota int not null,
  amount numeric(12, 2) not null,
  currency text not null default 'TZS',
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'cancelled', 'refunded')),
  checkout_id text,
  email text,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists topups_uid on public.topups (uid, created_at desc);
alter table public.topups enable row level security;
drop policy if exists topups_read on public.topups;
create policy topups_read on public.topups for select to authenticated using (uid = auth.uid() or public.is_admin());

create or replace function public.nyota_state() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nyota', coalesce((select nyota from wallets where uid = auth.uid()), 0),
    'owned', coalesce((select jsonb_agg(jsonb_build_object('item', item, 'until', until)) from nyota_owned where uid = auth.uid() and (until is null or until > now())), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price, 'days', days) order by price) from nyota_items where active), '[]'::jsonb),
    'packs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nyota', nyota, 'price', price) order by price) from nyota_packs where active), '[]'::jsonb));
$$;

create or replace function public.nyota_buy(p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it public.nyota_items; bal int;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into it from nyota_items where id = p_item and active;
  if it.id is null then raise exception 'That item is not for sale.' using errcode = 'P0001'; end if;
  if it.days is null and exists (select 1 from nyota_owned where uid = auth.uid() and item = p_item) then raise exception 'You already own this.' using errcode = 'P0001'; end if;
  update wallets set nyota = nyota - it.price, updated_at = now() where uid = auth.uid() and nyota >= it.price returning nyota into bal;
  if bal is null then raise exception 'Not enough Nyota.' using errcode = 'P0001'; end if;
  insert into wallet_ledger (uid, delta, reason, ref) values (auth.uid(), -it.price, 'buy', p_item);
  insert into nyota_owned (uid, item, until) values (auth.uid(), p_item, case when it.days is null then null else now() + make_interval(days => it.days) end)
  on conflict (uid, item) do update set bought_at = now(),
    until = case when it.days is null then null else greatest(coalesce(nyota_owned.until, now()), now()) + make_interval(days => it.days) end;
  return nyota_state();
end $$;

-- a paid top-up: credited once, however many times Bachs tells us (service role only)
create or replace function public.nyota_credit(p_topup uuid) returns int
language plpgsql security definer set search_path = public as $$
declare t public.topups;
begin
  update topups set status = 'paid', paid_at = now() where id = p_topup and status = 'pending_payment' returning * into t;
  if t.id is null then return 0; end if;
  insert into wallets (uid, nyota) values (t.uid, t.nyota) on conflict (uid) do update set nyota = wallets.nyota + excluded.nyota, updated_at = now();
  insert into wallet_ledger (uid, delta, reason, ref) values (t.uid, t.nyota, 'topup', t.id::text);
  return t.nyota;
end $$;

-- the owner refunds a top-up (after refunding the money in Bachs): takes back what is left of those Nyota
create or replace function public.nyota_refund(p_topup uuid) returns int
language plpgsql security definer set search_path = public as $$
declare t public.topups; took int;
begin
  if not public.is_admin() then raise exception 'Owners only.' using errcode = 'P0001'; end if;
  update topups set status = 'refunded' where id = p_topup and status = 'paid' returning * into t;
  if t.id is null then return 0; end if;
  select nyota into took from wallets where uid = t.uid for update;
  took := least(coalesce(took, 0), t.nyota);
  update wallets set nyota = nyota - took, updated_at = now() where uid = t.uid;
  insert into wallet_ledger (uid, delta, reason, ref) values (t.uid, -took, 'refund', t.id::text);
  return took;
end $$;

-- a save code loaded on another device: its Nyota and items move with it (called by save_load)
create or replace function public.nyota_move(p_from uuid, p_to uuid) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  delete from wallets where uid = p_from returning nyota into n;
  if coalesce(n, 0) > 0 then
    insert into wallets (uid, nyota) values (p_to, n) on conflict (uid) do update set nyota = wallets.nyota + excluded.nyota, updated_at = now();
    insert into wallet_ledger (uid, delta, reason, ref) values (p_from, -n, 'move_out', p_to::text), (p_to, n, 'move_in', p_from::text);
  end if;
  insert into nyota_owned (uid, item, until, bought_at) select p_to, item, until, bought_at from nyota_owned where uid = p_from
  on conflict (uid, item) do update set until = case when excluded.until is null or nyota_owned.until is null then null else greatest(excluded.until, nyota_owned.until) end;
  delete from nyota_owned where uid = p_from;
  update topups set uid = p_to where uid = p_from;  -- purchase records follow the save, so refunds find it
end $$;

revoke execute on function public.nyota_credit(uuid), public.nyota_move(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.nyota_buy(text), public.nyota_state(), public.nyota_refund(uuid) from public, anon;
grant execute on function public.nyota_buy(text), public.nyota_state(), public.nyota_refund(uuid) to authenticated;
grant select on public.wallets, public.wallet_ledger, public.nyota_items, public.nyota_packs, public.nyota_owned, public.topups to authenticated;
grant select on public.nyota_items, public.nyota_packs to anon;

-- unpaid top-up checkouts are closed after two days (part of the nightly clean-up)
create or replace function public.afc_cleanup() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from chat_messages where created_at < now() - interval '30 days';
  delete from events where at < now() - interval '90 days';
  delete from save_tries where at < now() - interval '2 days';
  delete from saves where updated_at < now() - interval '12 months';
  delete from scores where updated_at < now() - interval '12 months';
  delete from docs where (coll = 'stats' or coll = 'reports' or coll like 'feedback%') and updated_at < now() - interval '12 months';
  update topups set status = 'cancelled' where status = 'pending_payment' and created_at < now() - interval '2 days';
end $$;
revoke execute on function public.afc_cleanup() from public, anon, authenticated;


-- =====================================================================================================
-- Version 4 (October 2026): unique fan names you lock in, and invite counts for the Play with friends panel
-- =====================================================================================================
-- key: the name with only its letters and digits, lower case, so "Zuri K" and "zuri_k" are the same name
create table if not exists public.nicknames (
  key text primary key,
  nick text not null,
  uid uuid not null unique,                 -- one locked name per player
  claimed_at timestamptz not null default now(),
  constraint nick_shape check (char_length(nick) between 3 and 16 and key ~ '^[a-z0-9]{3,16}$')
);
alter table public.nicknames enable row level security;
drop policy if exists nicknames_read on public.nicknames;
create policy nicknames_read on public.nicknames for select to anon, authenticated using (true);
grant select on public.nicknames to anon, authenticated;
revoke insert, update, delete on public.nicknames from anon, authenticated;

create table if not exists public.nick_reserved (key text primary key);
alter table public.nick_reserved enable row level security;
insert into public.nick_reserved (key) values ('afconcity'), ('afcon'), ('admin'), ('administrator'), ('support'), ('moderator'), ('mod'), ('staff'), ('official'),
  ('owner'), ('system'), ('caf'), ('fan'), ('guest'), ('player'), ('amina'), ('zuri'), ('mwizi'), ('trafiki'), ('police'), ('polisi'), ('anthropic'), ('claude')
on conflict do nothing;

create or replace function public.nick_key(p text) returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'))
$$;
-- free | mine | taken | reserved | rude | bad
create or replace function public.nick_status(p_nick text) returns text
language plpgsql stable security definer set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p_nick, ''), '\s+', ' ', 'g')); k text := public.nick_key(n); w text; who uuid;
begin
  if char_length(n) < 3 or char_length(n) > 16 or n !~ '^[A-Za-z0-9][A-Za-z0-9 _.-]*[A-Za-z0-9]$' or char_length(k) < 3 then return 'bad'; end if;
  for w in select word from chat_words loop
    if n ~* ('\m' || w || '\M') or k = w then return 'rude'; end if;
  end loop;
  if exists (select 1 from nick_reserved r where r.key = k) or k ~ '^fan[0-9]*$' then return 'reserved'; end if;
  select uid into who from nicknames where key = k;
  if who is null then return 'free'; end if;
  if who = auth.uid() then return 'mine'; end if;
  return 'taken';
end $$;

create or replace function public.nick_claim(p_nick text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p_nick, ''), '\s+', ' ', 'g')); k text := public.nick_key(n); st text; cur public.nicknames;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if exists (select 1 from chat_bans b where b.uid = auth.uid()) then raise exception 'You cannot lock in a name.' using errcode = 'P0001'; end if;
  st := public.nick_status(n);
  if st = 'mine' then update nicknames set nick = n where uid = auth.uid(); return jsonb_build_object('nick', n, 'status', 'mine'); end if;
  if st <> 'free' then
    raise exception '%', case st when 'taken' then 'Another fan has locked in that name.' when 'rude' then 'Please pick a friendlier name.'
      when 'reserved' then 'That name is reserved.' else 'Use 3 to 16 letters or numbers.' end using errcode = 'P0001';
  end if;
  select * into cur from nicknames where uid = auth.uid();
  if cur.uid is not null and cur.claimed_at > now() - interval '1 day' then raise exception 'You can change your locked name once a day.' using errcode = 'P0001'; end if;
  delete from nicknames where uid = auth.uid();
  begin
    insert into nicknames (key, nick, uid) values (k, n, auth.uid());
  exception when unique_violation then raise exception 'Another fan has locked in that name.' using errcode = 'P0001';
  end;
  return jsonb_build_object('nick', n, 'status', 'mine');
end $$;

create or replace function public.nick_mine() returns text language sql stable security definer set search_path = public as $$
  select nick from nicknames where uid = auth.uid()
$$;
-- a save code moved to a new device takes its locked name along (unless the new device has one already)
create or replace function public.nick_move(p_from uuid, p_to uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  if exists (select 1 from nicknames where uid = p_to) then return; end if;
  update nicknames set uid = p_to where uid = p_from;
end $$;

create or replace function public.my_invites() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('joined', count(*), 'paid', count(*) filter (where qualified)) from invites where inviter = auth.uid()
$$;

revoke execute on function public.nick_move(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.nick_claim(text), public.nick_mine(), public.my_invites() from public, anon;
grant execute on function public.nick_claim(text), public.nick_mine(), public.my_invites() to authenticated;
grant execute on function public.nick_status(text), public.nick_key(text) to anon, authenticated;
