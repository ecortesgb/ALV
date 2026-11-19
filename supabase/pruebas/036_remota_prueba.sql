-- Prueba de la 036 en la base remota: se manda la 036 completa y después este bloque, en una sola llamada.
-- Termina SIEMPRE con una excepción: nada queda guardado (ni la 036, ni los usuarios simulados, ni sus monedas).
-- Autorizada por Elías el 2026-11-19 («Sí, pruébala»).
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); u uuid; r text := ''; n int; j jsonb; m int; yo text := current_user;
  p1 uuid := gen_random_uuid();
begin
  select count(*) into n from public.sobres_tienda; r := r || 'sobres ' || n;
  select count(*) into n from public.comodines_tienda; r := r || ' | comodines ' || n;

  foreach u in array array[a, b] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b);

  -- A: bienvenida una sola vez
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select e.monedas into m from public.estado_tienda() e; r := r || ' | bienvenida ' || m;
  select e.monedas into m from public.estado_tienda() e; r := r || ' (otra vez ' || m || ')';

  -- A abre un básico y reintenta con el mismo pedido
  j := public.abrir_sobre('basico', p1);
  r := r || ' | básico: ' || jsonb_array_length(j -> 'cartas') || ' cartas, quedan ' || (j ->> 'monedas');
  j := public.abrir_sobre('basico', p1);
  r := r || ' | reintento: repetido=' || coalesce(j ->> 'repetido', 'no') || ', quedan ' || (j ->> 'monedas');
  select count(*) into n from public.piezas_jugador where jugador = a and origen = 'sobre'; r := r || ', piezas de sobre ' || n;
  begin perform public.admin_dar_monedas(a, 1000); r := r || ' | FALLA A se dio monedas';
  exception when others then r := r || ' | A admin: ' || sqlerrm; end;
  begin insert into public.movimientos_monedas (jugador, cantidad, motivo) values (a, 9999, 'trampa'); r := r || ' | FALLA A escribió monedas';
  exception when others then r := r || ' | A escribe monedas: ' || sqlerrm; end;

  -- Saldo de prueba (como dueño de la base) y más sobres
  perform set_config('role', yo, true);
  insert into public.movimientos_monedas (jugador, cantidad, motivo) values (a, 1000, 'prueba');
  perform set_config('role', 'authenticated', true);
  j := public.abrir_sobre('epico', gen_random_uuid());
  r := r || ' | épico: mejor=' || (j ->> 'mejor') || ' última=' || (j -> 'cartas' -> -1 ->> 'rareza')
       || ' épicas+=' || (select count(*) from jsonb_array_elements(j -> 'cartas') x where x ->> 'rareza' in ('epica', 'legendaria'));
  j := public.abrir_sobre('comodines', gen_random_uuid());
  r := r || ' | comodines: ' || (select count(*) from jsonb_array_elements(j -> 'cartas') x where x ->> 'tipo' = 'comodin');
  j := public.abrir_sobre('accesorios', gen_random_uuid());
  r := r || ' | accesorios fuera de sección: ' || (select count(*) from jsonb_array_elements(j -> 'cartas') x
       where privado.seccion_pieza(x ->> 'id') not in ('casco', 'detalle', 'cuello', 'objeto'));
  j := public.abrir_sobre('mixto', gen_random_uuid());
  r := r || ' | mixto: ' || jsonb_array_length(j -> 'cartas') || ' cartas, quedan ' || (j ->> 'monedas');
  select coalesce(sum(cantidad), 0) into n from public.comodines_jugador where jugador = a; r := r || ', comodines de A ' || n;

  -- B: sin bienvenida no abre, no ve lo de A, y gana monedas jugando en un solo aparato
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin perform public.abrir_sobre('basico', gen_random_uuid()); r := r || ' | FALLA B abrió sin monedas';
  exception when others then r := r || ' | B sin monedas: ' || sqlerrm; end;
  select count(*) into n from public.movimientos_monedas where jugador = a; r := r || ' | B ve monedas de A: ' || n;
  select count(*) into n from public.aperturas where jugador = a; r := r || ', aperturas de A: ' || n;
  select count(*) into n from public.comodines_jugador where jugador = a; r := r || ', comodines de A: ' || n;
  perform public.registrar_partida('impostor', 2, 0, 1, 2);
  select coalesce(sum(cantidad), 0) into n from public.movimientos_monedas where jugador = b; r := r || ' | B jugó 1.º de 2: monedas ' || n;
  begin perform privado.dar_monedas_partida(b, 1, 4, null, 'impostor'); r := r || ' | FALLA B llamó privado';
  exception when others then r := r || ' | B privado: ' || sqlerrm; end;

  -- Anónimo
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin perform public.abrir_sobre('basico', gen_random_uuid()); r := r || ' | FALLA anon abrió';
  exception when others then r := r || ' | anon abre: ' || sqlerrm; end;
  begin select count(*) into n from public.sobres_tienda; r := r || ' | FALLA anon lee sobres';
  exception when others then r := r || ' | anon sobres: ' || sqlerrm; end;

  perform set_config('role', yo, true);
  r := r || ' | comprar_sobre vieja para authenticated: ' || has_function_privilege('authenticated', 'public.comprar_sobre(text)', 'execute');
  r := r || ' | terminar_partida_sala da monedas: ' || (select prosrc like '%dar_monedas_partida%' from pg_proc where oid = 'public.terminar_partida_sala(uuid,text,int,jsonb)'::regprocedure);
  raise exception 'RESULTADO (se deshace): %', r;
end $$;
