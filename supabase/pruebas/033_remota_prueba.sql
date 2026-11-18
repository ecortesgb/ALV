-- Prueba de la 033 en la base remota: se manda la 033 completa y después este bloque, en una sola transacción.
-- Termina SIEMPRE con una excepción: nada queda guardado (ni la 033, ni los usuarios simulados).
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); u uuid; r text := ''; n int; t text; s record; yo text := current_user;
  dueno uuid := (select fj.jugador from public.figuras_jugador fj limit 1);
  fchef jsonb := '{"version":2,"identidad":{"rostro":"FACE_001","detalles":[],"piel":"#f2cd37"},"ropa":{"torso":{"color":"#f4f4f4","estampado":"PRINT_014","colores":[]},"piernas":{"color":"#000000"}},"accesorios":{"cabeza":{"id":"HELM_004"},"mano_der":{"id":"ACC_011"}},"momentos":{"paquete":null}}';
  fbat jsonb := '{"version":2,"identidad":{"rostro":"FACE_001","detalles":[]},"ropa":{"torso":{"color":"#1d3f8f","estampado":"PRINT_001","colores":[]},"piernas":{"color":"#000000"}},"accesorios":{}}';
  fcomun jsonb := '{"version":2,"identidad":{"rostro":"FACE_001","detalles":[]},"ropa":{"torso":{"color":"#c91a09","estampado":null,"colores":[]},"piernas":{"color":"#0055bf"}},"accesorios":{}}';
begin
  select count(*) into n from public.piezas_figura; r := r || 'piezas ' || n;
  select count(*) into n from public.retos_figura; r := r || ' | retos ' || n;
  select count(*) into n from public.piezas_jugador where origen = 'regalo'; r := r || ' | regalos ' || n;

  foreach u in array array[a, b] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b);

  -- A guarda una figura común (sí) y una con pieza bloqueada (no)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.figuras_jugador (jugador, capsula, figura, activa) values (a, 1, fcomun, true);
  r := r || ' | A guarda común: ok';
  begin update public.figuras_jugador set figura = fbat where jugador = a and capsula = 1; r := r || ' | FALLA guardó bloqueada';
  exception when others then r := r || ' | bloqueada: ' || sqlerrm; end;
  begin perform public.desbloquear_pieza('PRINT_001'); r := r || ' | FALLA desbloqueó sin saldo';
  exception when others then r := r || ' | sin saldo: ' || sqlerrm; end;
  begin insert into public.piezas_jugador (jugador, pieza, origen) values (a, 'PRINT_001', 'xp'); r := r || ' | FALLA insertó directo';
  exception when others then r := r || ' | directo: ' || sqlerrm; end;

  -- A recibe 2000 XP (como servidor) y compra
  perform set_config('role', yo, true);
  insert into public.movimientos_xp (jugador, tipo, xp, motivo) values (a, 'ganada', 2000, 'prueba');
  perform set_config('role', 'authenticated', true);
  perform public.desbloquear_pieza('PRINT_001');
  perform set_config('role', yo, true);
  select * into s from privado.saldos_de(a); r := r || ' | tras comprar: disp ' || s.disponible || ' acum ' || s.acumulada;
  perform set_config('role', 'authenticated', true);
  update public.figuras_jugador set figura = fbat where jugador = a and capsula = 1; r := r || ' | guarda la comprada: ok';
  begin perform public.desbloquear_pieza('PRINT_001'); r := r || ' | FALLA compró dos veces';
  exception when others then r := r || ' | dos veces: ' || sqlerrm; end;
  begin perform public.desbloquear_pieza('NO_EXISTE'); r := r || ' | FALLA pieza falsa';
  exception when others then r := r || ' | falsa: ' || sqlerrm; end;

  -- Reto de combinación
  begin perform * from public.reclamar_reto('combo-chef', 1::smallint); r := r || ' | FALLA reclamó sin cumplir';
  exception when others then r := r || ' | no cumple: ' || sqlerrm; end;
  perform public.desbloquear_pieza('PRINT_014');
  update public.figuras_jugador set figura = fchef where jugador = a and capsula = 1;
  select x.pieza into t from public.reclamar_reto('combo-chef', 1::smallint) x; r := r || ' | chef da: ' || coalesce(t, 'null');
  begin perform * from public.reclamar_reto('combo-chef', 1::smallint); r := r || ' | FALLA reclamó dos veces';
  exception when others then r := r || ' | chef otra vez: ' || sqlerrm; end;
  perform set_config('role', yo, true); select privado.reto_del_dia((now() at time zone 'America/Mexico_City')::date) into t; perform set_config('role', 'authenticated', true);
  begin perform * from public.reclamar_reto(case when t = 'dia-gorra' then 'dia-negro' else 'dia-gorra' end, 1::smallint); r := r || ' | FALLA reto de otro día';
  exception when others then r := r || ' | hoy es ' || t || ', otro: ' || sqlerrm; end;
  select count(*) into n from public.piezas_jugador; r := r || ' | A ve sus piezas: ' || n;

  -- B no ve lo de A
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.piezas_jugador; r := r || ' | B ve piezas: ' || n;
  select count(*) into n from public.retos_jugador; r := r || ' | B ve retos: ' || n;
  begin perform * from public.reclamar_reto('combo-chef', 1::smallint); r := r || ' | FALLA B sin cápsula';
  exception when others then r := r || ' | B sin cápsula: ' || sqlerrm; end;

  -- anon no ejecuta nada
  perform set_config('role', 'anon', true);
  begin perform public.desbloquear_pieza('PRINT_002'); r := r || ' | FALLA anon';
  exception when others then r := r || ' | anon: ' || sqlerrm; end;
  begin select count(*) into n from public.piezas_figura; r := r || ' | FALLA anon lee catálogo';
  exception when others then r := r || ' | anon catálogo: ' || sqlerrm; end;

  -- El dueño de las figuras ya guardadas las puede volver a guardar (el regalo cubre lo que usaba)
  perform set_config('role', 'authenticated', true);
  if dueno is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', dueno, 'role', 'authenticated')::text, true);
    update public.figuras_jugador set figura = figura where jugador = dueno;
    get diagnostics n = row_count; r := r || ' | dueño regraba ' || n || ' figuras: ok';
  end if;

  perform set_config('role', yo, true);
  raise exception 'RESULTADO (se deshace): %', r;
end $$;
