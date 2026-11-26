-- Prueba de 045 (personajes privados) en la base remota, SIN dejar nada: se pega la migración y después este bloque en
-- UNA sola ejecución; el bloque termina SIEMPRE con una excepción, que deshace todo (también la migración).
-- Cuentas simuladas: A administradora, F amiga, S extraña con sesión, G invitada, M menor. Objetos simulados en
-- storage.objects (solo la fila, que es lo que mira la política). `storage.operation` se fija a mano como lo hace el API
-- de Storage en cada petición.
-- La prueba con el API real de Storage (subir, bajar, firmar, listar, borrar, sobrescribir) está en el stack local:
-- ver ALV_PLAN_PERSONAJES_PRIVADOS.md (fuera del repo), 31 de 31.
-- RESULTADO 2026-11-26 en la base remota (nada quedó: bucket, tablas, funciones, políticas y usuarios de prueba en 0):
--   bucket publico=false; anon 0; S, G, M y F sin acceso: descarga 0 y entrega null; A no fija una entrega sin índice;
--   A fija (antes ninguna); A no da acceso a G ni a M; A: list 2, sign 0, info 2, upload_update 0; S no se da acceso, no
--   fija entrega, no lee la tabla, no sube; F con acceso: get_authenticated 2, sign 0, sign_many 0, list 0, list_v2 0,
--   info 0, delete_many 0, sin operación 0, entrega = sello, no sube; A quita a F → descarga 0 y entrega null.
--   (Corrida con `object.upload` todavía en «admin lee»; después se quitó porque subir no lo necesita: probado en local.)
--   Asesor antes de aplicar: 58 WARN RPC + 8 INFO tabla sin política. Esperado después: +7 RPC (las funciones nuevas,
--   permiso validado dentro) y +2 INFO (privado.acceso_personajes y privado.entrega_personajes, como administradores).
do $$
declare
  a uuid := gen_random_uuid(); f uuid := gen_random_uuid(); s uuid := gen_random_uuid();
  g uuid := gen_random_uuid(); m uuid := gen_random_uuid();
  u uuid; r text := ''; n int; ok boolean; op text;
begin
  foreach u in array array[a, f, s, g, m] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'p045_' || left(x::text, 6) from unnest(array[a, f, s, g, m]) x
    on conflict (id) do update set nombre = excluded.nombre;
  update public.perfiles set mayor_18 = true where id in (a, f, s, g);
  update public.perfiles set mayor_18 = false where id = m;
  update public.perfiles set invitado = true where id = g;
  insert into privado.administradores (jugador) values (a);
  insert into storage.objects (bucket_id, name, metadata) values
    ('personajes-privados', 'objetos/' || repeat('a', 64) || '.glb', '{"size": 1}'::jsonb),
    ('personajes-privados', 'indices/20261126T101500Z.json', '{"size": 1}'::jsonb);

  select public into ok from storage.buckets where id = 'personajes-privados';
  r := r || 'bucket publico=' || ok || '; ';

  -- anon con descarga
  perform set_config('storage.operation', 'object.get_authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
  select count(*) into n from storage.objects where bucket_id = 'personajes-privados';
  r := r || 'anon ve=' || n || '; ';
  perform set_config('role', 'postgres', true);

  -- Sin acceso
  foreach u in array array[s, g, m, f] loop
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into n from storage.objects where bucket_id = 'personajes-privados';
    r := r || case u when s then 'S' when g then 'G' when m then 'M' else 'F(antes)' end || ' descarga=' || n
           || ' entrega=' || coalesce(public.entrega_personajes(), 'null') || '; ';
    perform set_config('role', 'postgres', true);
  end loop;

  -- A fija la entrega (y no una inexistente); da acceso a F; no a G ni M
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin perform public.admin_fijar_entrega_personajes('20000101T000000Z'); r := r || 'A fija inexistente=SI(MAL); ';
  exception when others then r := r || 'A fija inexistente=no(' || sqlerrm || '); '; end;
  r := r || 'A fija (antes)=' || coalesce(public.admin_fijar_entrega_personajes('20261126T101500Z'), 'ninguna') || '; ';
  perform public.admin_dar_acceso_personajes('p045_' || left(f::text, 6));
  begin perform public.admin_dar_acceso_personajes('p045_' || left(g::text, 6)); r := r || 'A da a G=SI(MAL); ';
  exception when others then r := r || 'A da a G=no; '; end;
  begin perform public.admin_dar_acceso_personajes('p045_' || left(m::text, 6)); r := r || 'A da a M=SI(MAL); ';
  exception when others then r := r || 'A da a M=no; '; end;
  foreach op in array array['object.list', 'object.sign', 'object.get_authenticated_info', 'object.upload_update'] loop
    perform set_config('storage.operation', op, true);
    select count(*) into n from storage.objects where bucket_id = 'personajes-privados';
    r := r || 'A ' || op || '=' || n || '; ';
  end loop;
  perform set_config('role', 'postgres', true);

  -- S intenta lo de administrador
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin perform public.admin_dar_acceso_personajes('p045_' || left(s::text, 6)); r := r || 'S se da acceso=SI(MAL); ';
  exception when others then r := r || 'S se da acceso=no; '; end;
  begin perform public.admin_fijar_entrega_personajes('20261126T101500Z'); r := r || 'S fija entrega=SI(MAL); ';
  exception when others then r := r || 'S fija entrega=no; '; end;
  begin select count(*) into n from privado.entrega_personajes; r := r || 'S lee tabla entrega=SI(MAL); ';
  exception when others then r := r || 'S lee tabla entrega=no; '; end;
  perform set_config('storage.operation', 'object.upload', true);
  begin insert into storage.objects (bucket_id, name) values ('personajes-privados', 'objetos/' || repeat('b', 64) || '.glb');
    r := r || 'S sube=SI(MAL); ';
  exception when others then r := r || 'S sube=no; '; end;
  perform set_config('role', 'postgres', true);

  -- F con acceso: solo descarga
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  foreach op in array array['object.get_authenticated', 'object.sign', 'object.sign_many', 'object.list', 'object.list_v2',
                            'object.get_authenticated_info', 'object.delete_many', ''] loop
    perform set_config('storage.operation', op, true);
    select count(*) into n from storage.objects where bucket_id = 'personajes-privados';
    r := r || 'F ' || coalesce(nullif(op, ''), '(sin operación)') || '=' || n || '; ';
  end loop;
  r := r || 'F entrega=' || coalesce(public.entrega_personajes(), 'null') || '; ';
  perform set_config('storage.operation', 'object.upload', true);
  begin insert into storage.objects (bucket_id, name) values ('personajes-privados', 'objetos/' || repeat('c', 64) || '.glb');
    r := r || 'F sube=SI(MAL); ';
  exception when others then r := r || 'F sube=no; '; end;
  perform set_config('role', 'postgres', true);

  -- A quita a F
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  r := r || 'A quita F=' || public.admin_quitar_acceso_personajes('p045_' || left(f::text, 6)) || '; ';
  perform set_config('role', 'postgres', true);
  perform set_config('storage.operation', 'object.get_authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from storage.objects where bucket_id = 'personajes-privados';
  r := r || 'F(quitada) descarga=' || n || ' entrega=' || coalesce(public.entrega_personajes(), 'null') || '; ';
  perform set_config('role', 'postgres', true);

  raise exception 'FIN PRUEBA 045 (todo deshecho): %', r;
end $$;
