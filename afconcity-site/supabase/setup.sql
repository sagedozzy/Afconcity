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
  for w in select word from public.chat_words loop
    -- whole words only, so everyday words that merely start the same way (kumaliza) are left alone
    new.body := regexp_replace(new.body, '\m' || w || '\M', '***', 'gi');
    new.nick := regexp_replace(new.nick, '\m' || w || '\M', 'Fan', 'gi');
  end loop;
  if new.nick = '' then new.nick := 'Fan'; end if;
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
