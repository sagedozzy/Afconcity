#!/bin/bash
# Exercise the setup.sql rules against a local Postgres that mimics Supabase's roles and auth helpers.
D=/var/tmp/afcpg; P="psql -h $D -p 5433 -U postgres -d sb -tA -q"
A=11111111-1111-1111-1111-111111111111   # anonymous player A
B=22222222-2222-2222-2222-222222222222   # anonymous player B
O=99999999-9999-9999-9999-999999999999   # the owner (support@afconcity.com)
pass=0; fail=0
as() { # as <role> <claims-json> <sql> : runs in its own transaction as that role; prints result or ERR:<message>
  $P -c "begin; set local role $1; set local request.jwt.claims = '$2'; $3; commit;" 2>&1 | sed -E 's/^psql:[^:]*:[0-9]+: //; s/^ERROR: +/ERR: /' | grep -v -e '^$' -e '^CONTEXT' | tail -1
}
expect() { # expect <name> <pattern> <actual>
  if [[ "$3" =~ $2 ]]; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1  (got: $3)"; fi
}
PA="{\"sub\":\"$A\",\"role\":\"authenticated\",\"is_anonymous\":true}"
PB="{\"sub\":\"$B\",\"role\":\"authenticated\",\"is_anonymous\":true}"
PO="{\"sub\":\"$O\",\"role\":\"authenticated\",\"email\":\"Support@AfconCity.com\",\"is_anonymous\":false}"
PX="{\"sub\":\"$B\",\"role\":\"authenticated\",\"email\":\"someone@example.com\",\"is_anonymous\":false}"
$P -c "delete from docs; delete from chat_messages; delete from chat_bans;"

expect 'owner is admin' '^t$' "$(as authenticated "$PO" 'select public.is_admin()')"
expect 'anonymous player is not admin' '^f$' "$(as authenticated "$PA" 'select public.is_admin()')"
expect 'other email is not admin' '^f$' "$(as authenticated "$PX" 'select public.is_admin()')"
expect 'owner books a billboard' '^$|COMMIT' "$(as authenticated "$PO" "insert into docs (coll,id,data) values ('billboards','b1','{\"brand\":\"Kibo\"}')")"
expect 'visitor (no login) sees bookings' 'Kibo' "$(as anon '{}' "select data->>'brand' from docs where coll='billboards'")"
expect 'player cannot book a billboard' 'ERR: new row violates row-level security' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('billboards','b2','{}')")"
expect 'player cannot overwrite a booking' '^$|COMMIT|UPDATE 0' "$(as authenticated "$PA" "update docs set data='{\"brand\":\"Hack\"}' where coll='billboards' and id='b1'")"
expect 'booking unchanged after attempt' 'Kibo' "$(as anon '{}' "select data->>'brand' from docs where coll='billboards' and id='b1'")"
expect 'player cannot delete a booking' 'Kibo' "$(as authenticated "$PA" "delete from docs where coll='billboards'"; as anon '{}' "select data->>'brand' from docs where coll='billboards' and id='b1'")"
expect 'visitor cannot write at all' 'ERR: permission denied' "$(as anon '{}' "insert into docs (coll,id,data) values ('billboards','b3','{}')")"
expect 'owner saves the booking contact' '^$|COMMIT' "$(as authenticated "$PO" "insert into docs (coll,id,data) values ('config','ads','{\"contact\":\"support@afconcity.com\"}')")"
expect 'player saves own stats' '^$|COMMIT' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('stats','$A','{\"minutes\":3}')")"
expect 'player updates own stats' '^$|COMMIT' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('stats','$A','{\"minutes\":5}') on conflict (coll,id) do update set data = excluded.data")"
expect 'player cannot write stats for someone else' 'ERR: new row violates' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('stats','$B','{}')")"
expect 'player B cannot read A stats' '^0$' "$(as authenticated "$PB" "select count(*) from docs where coll='stats'")"
expect 'owner reads all stats' '^1$' "$(as authenticated "$PO" "select count(*) from docs where coll='stats'")"
expect 'player sends feedback' '^$|COMMIT' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('feedback/$A/items','f1','{\"text\":\"great\"}')")"
expect 'player cannot post feedback as someone else' 'ERR: new row violates' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('feedback/$B/items','f2','{}')")"
expect 'big player rows refused' 'ERR: new row violates' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('feedback/$A/items','f3', jsonb_build_object('t', repeat('x', 9000)))")"
expect 'owner reads feedback' '^1$' "$(as authenticated "$PO" "select count(*) from docs where coll like 'feedback/%'")"
# chat
expect 'player chats' '^$|COMMIT' "$(as authenticated "$PA" "insert into chat_messages (nick, body) values ('Asha','Mambo Fumba!')")"
expect 'visitor can read recent chat' 'Mambo Fumba!' "$(as anon '{}' "select body from chat_messages")"
expect 'second message within 1.5 s refused' 'Slow down' "$(as authenticated "$PA" "insert into chat_messages (nick, body) values ('Asha','again')")"
sleep 1.6
expect 'swear words are starred' '\*\*\*' "$(as authenticated "$PA" "insert into chat_messages (nick, body) values ('Asha','you are a Fucking idiot') returning body")"
sleep 1.6
expect 'innocent words that start the same are kept' 'kumaliza' "$(as authenticated "$PA" "insert into chat_messages (nick, body) values ('Asha','nataka kumaliza kazi') returning body")"
sleep 1.6
expect 'rude nickname replaced' '^Fan' "$(as authenticated "$PA" "insert into chat_messages (nick, body) values ('shit','hi') returning nick")"
expect 'cannot chat as someone else' 'ERR: new row violates' "$(as authenticated "$PA" "insert into chat_messages (owner, nick, body) values ('$B','B','fake')")"
expect 'visitor cannot chat' 'ERR: permission denied' "$(as anon '{}' "insert into chat_messages (nick, body) values ('x','y')")"
expect 'over-long messages refused' 'violates check constraint' "$(as authenticated "$PB" "insert into chat_messages (nick, body) values ('B', repeat('a', 91))")"
expect 'player cannot ban' 'ERR: new row violates' "$(as authenticated "$PA" "insert into chat_bans (uid) values ('$B')")"
expect 'owner bans player B' '^$|COMMIT' "$(as authenticated "$PO" "insert into chat_bans (uid, reason) values ('$B','test')")"
expect 'banned player cannot chat' 'cannot chat' "$(as authenticated "$PB" "insert into chat_messages (nick, body) values ('B','hello')")"
expect 'owner switches chat off' '^$|COMMIT' "$(as authenticated "$PO" "insert into docs (coll,id,data) values ('config','chat','{\"chat\":false}')")"
sleep 1.6
expect 'chat off: player refused' 'switched off' "$(as authenticated "$PA" "insert into chat_messages (nick, body) values ('Asha','hello?')")"
expect 'owner turns chat back on' '^$|COMMIT' "$(as authenticated "$PO" "update docs set data='{\"chat\":true}' where coll='config' and id='chat'")"
expect 'player can report' '^$|COMMIT' "$(as authenticated "$PA" "insert into docs (coll,id,data) values ('reports','r1','{\"target\":\"$B\"}')")"
expect 'players cannot read reports of others' '^0$' "$(as authenticated "$PB" "select count(*) from docs where coll='reports'")"
expect 'owner reads reports' '^1$' "$(as authenticated "$PO" "select count(*) from docs where coll='reports'")"
expect 'admins list is not readable' 'ERR: permission denied|^$' "$(as authenticated "$PA" "select email from admins")"
echo "$pass passed, $fail failed"
