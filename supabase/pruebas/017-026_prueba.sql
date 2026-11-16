-- ESTADO (16 nov 2026, tarde): 017, 018 y 028 quedaron aplicadas con autorización de Elías. Antes se probaron junto con 028
-- (invitados) con usuarios simulados en una transacción deshecha: sin fallas. El menor no entra ni como invitado, una cuenta
-- normal no se vuelve invitada, nadie lee partidas.semilla, solo el control crea partidas y manda 'control', y
-- admin_borrar_invitados borra invitados sin tocar cuentas normales.
-- Nota anterior: 019, 020 y 026 están aplicadas; 017 y 018 esperaban autorización.
-- Este archivo es la prueba para DESPUÉS de aplicar 017 y 018 (usa crear_partida_sala, arranques_partida y el tipo 'control').
-- La prueba que sí se corrió el 16 nov, con el esquema de hoy y usuarios simulados en una transacción deshecha, dio:
--   menor no entra / no abre sala / no se inserta directo: rechazado («solo mayores de 18», permiso denegado)
--   quien no tiene el control: no crea partida, no publica, no da XP, no suplanta a otro, ve 0 acciones ajenas
--     (el arranque con la semilla no lo lee), lee semilla 0 en partidas y solo su propio secreto
--   cuenta fuera de la sala: 0 partidas, 0 acciones, 0 secretos; no manda acciones ni da XP; su ranking es solo ella
--   quien tiene el control: ve las acciones, da XP por reto (1 a 200) solo a miembros; anon no ejecuta nada
-- Prueba de 017–020 y 026 con usuarios simulados. Termina SIEMPRE con una excepción: nada queda guardado.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); m uuid := gen_random_uuid();
  ev uuid; cod text; pa uuid; r text := ''; n int; u uuid;
begin
  foreach u in array array[a, b, c, m] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b, c, m]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b, c);
  update public.perfiles set mayor_18 = false where id = m;

  -- A abre la sala
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select x.id, x.codigo into ev, cod from public.crear_evento('Prueba', false, false) x;
  r := r || ' | A abre sala: ' || (ev is not null);

  -- M (menor) no entra ni abre
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  begin perform public.unirse_evento(cod); r := r || ' | FALLA menor entró';
  exception when others then r := r || ' | menor no entra: ' || sqlerrm; end;
  begin perform public.crear_evento('x', false, false); r := r || ' | FALLA menor abrió sala';
  exception when others then r := r || ' | menor no abre: ' || sqlerrm; end;

  -- B entra
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.unirse_evento(cod);
  begin perform public.crear_partida_sala(ev, 'impostor', 123, '{}'::jsonb); r := r || ' | FALLA B creó partida';
  exception when others then r := r || ' | B no crea partida: ' || sqlerrm; end;

  -- A crea la partida
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  pa := public.crear_partida_sala(ev, 'impostor', 123, '{"rondas":3}'::jsonb);
  select count(*) into n from public.arranques_partida where partida = pa; r := r || ' | A lee arranque: ' || n;
  insert into public.acciones (id, partida, jugador, tipo, datos) values ('prueba-ctl-a', pa, a, 'control', '{"que":"pausar"}');
  r := r || ' | A control ok';
  begin insert into public.partidas (evento, juego, semilla) values (ev, 'impostor', 5); r := r || ' | FALLA A insertó partida a mano';
  exception when others then r := r || ' | insertar partida a mano: ' || sqlerrm; end;

  -- B: no ve semilla ni arranque, no manda control, sí contesta
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin execute 'select semilla from public.partidas limit 1' into n; r := r || ' | FALLA B leyó semilla';
  exception when others then r := r || ' | B semilla: ' || sqlerrm; end;
  select count(*) into n from public.partidas where id = pa; r := r || ' | B ve partida (sin semilla): ' || n;
  select count(*) into n from public.arranques_partida; r := r || ' | B arranques: ' || n;
  begin insert into public.acciones (id, partida, jugador, tipo, datos) values ('prueba-ctl-b', pa, b, 'control', '{}'); r := r || ' | FALLA B mandó control';
  exception when others then r := r || ' | B control: ' || sqlerrm; end;
  insert into public.acciones (id, partida, jugador, tipo, datos) values ('prueba-con-b', pa, b, 'contestar', '{"valor":"x"}');
  begin insert into public.acciones (id, partida, jugador, tipo, datos) values ('prueba-sup-b', pa, a, 'contestar', '{}'); r := r || ' | FALLA B suplantó a A';
  exception when others then r := r || ' | B suplantar: ' || sqlerrm; end;
  begin perform public.dar_xp_reto(ev, b, 50); r := r || ' | FALLA B se dio XP';
  exception when others then r := r || ' | B xp-reto: ' || sqlerrm; end;
  select count(*) into n from public.acciones where partida = pa; r := r || ' | B ve acciones (solo suyas): ' || n;

  -- C (fuera de la sala): nada
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.partidas; r := r || ' | C partidas: ' || n;
  select count(*) into n from public.arranques_partida; r := r || ' | C arranques: ' || n;
  begin insert into public.acciones (id, partida, jugador, tipo, datos) values ('prueba-con-c', pa, c, 'contestar', '{}'); r := r || ' | FALLA C mandó acción';
  exception when others then r := r || ' | C acción: ' || sqlerrm; end;
  begin perform public.dar_xp_reto(ev, b, 50); r := r || ' | FALLA C dio XP';
  exception when others then r := r || ' | C xp-reto: ' || sqlerrm; end;
  select count(*) into n from public.ranking_conocidos(); r := r || ' | C ranking (solo él): ' || n;

  -- A: orden de acciones, XP por reto y ranking
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.acciones where partida = pa; r := r || ' | A ve acciones: ' || n;
  select string_agg(x.id, ',' order by x.n) into cod from public.acciones x where x.partida = pa; r := r || ' | orden: ' || cod;
  perform public.dar_xp_reto(ev, b, 50);
  begin perform public.dar_xp_reto(ev, c, 50); r := r || ' | FALLA XP a alguien de fuera';
  exception when others then r := r || ' | A xp a C: ' || sqlerrm; end;
  begin perform public.dar_xp_reto(ev, b, 5000); r := r || ' | FALLA XP 5000';
  exception when others then r := r || ' | A xp 5000: ' || sqlerrm; end;
  select count(*) into n from public.ranking_conocidos(); r := r || ' | A ranking (A y B): ' || n;
  select acumulada into n from public.ranking_conocidos() where id = b; r := r || ' | XP de B: ' || n;

  raise exception 'RESULTADO (se deshace todo)%', r;
end $$;
