-- 055 · Logros de ALV PARTY (Competitivo; Elías, 27 nov 2026: «cada minijuego también puede dar logros, experiencia y monedas»).
-- APLICADA 27 nov 2026 con el ok de Elías («aplica la 055»). Antes: prueba en la base remota en transacción deshecha (34 logros, 33 filas de progreso, authenticated sin ejecutar progreso_logros).
-- XP y monedas ya las da terminar_partida_sala (049) y los resultados se guardan en resultados_partida (040), así que los
-- logros generales (Primeros pasos, Polifacético, objetivos del día…) ya cuentan los minijuegos. Esta migración agrega
-- 6 logros propios de ALV PARTY: uno por minijuego (ganar 3 veces) y uno por jugar los 5.
-- Los logros siguen sin XP ni monedas (D0): la recompensa es la insignia.
-- Sin tablas nuevas ni permisos nuevos: solo filas en public.logros y privado.progreso_logros con 6 renglones más
-- (el resto es idéntico a la 043).

insert into public.logros (clave, categoria, juego, rareza, nombre, descripcion, meta, recompensa, orden) values
  ('pistolero',           'minijuego', 'mj-desenfunda', 'comun', 'Pistolero',           'Gana 3 veces en ¡Desenfunda!',      3, 'Insignia común', 510),
  ('a-prueba-de-balas',   'minijuego', 'mj-bala',       'comun', 'A prueba de balas',   'Gana 3 veces Esquiva la bala.',   3, 'Insignia común', 520),
  ('mano-de-piedra',      'minijuego', 'mj-martillazo', 'comun', 'Mano de piedra',      'Gana 3 veces Martillazo.',        3, 'Insignia común', 530),
  ('aterrizaje-perfecto', 'minijuego', 'mj-paracaidas', 'comun', 'Aterrizaje perfecto', 'Gana 3 veces Paracaídas.',        3, 'Insignia común', 540),
  ('sangre-fria',         'minijuego', 'mj-alto-total', 'comun', 'Sangre fría',         'Gana 3 veces Alto total.',        3, 'Insignia común', 550),
  ('alma-de-la-party',    'coleccion', null,            'rara',  'Alma de la party',    'Juega los 5 minijuegos de ALV PARTY.', 5, 'Insignia rara', 560)
on conflict (clave) do nothing;

create or replace function privado.progreso_logros(p_jugador uuid) returns table (clave text, va int)
language sql stable security definer set search_path = '' as $$
  with r as (select * from public.resultados_partida where jugador = p_jugador),
  gano as (select * from r where cuenta and lugar = 1),
  otros as (select distinct o.jugador from public.resultados_partida o join r on r.partida = o.partida where o.jugador <> p_jugador),
  racha as (select coalesce(max(n), 0) n from (
              select count(*) n from (
                select lugar = 1 g, row_number() over (order by creada) - row_number() over (partition by lugar = 1 order by creada) k
                from r where cuenta) a where g group by k) b),
  nivel as (select public.nivel_por_xp(s.acumulada) n from privado.saldos_de(p_jugador) s)
  select x.clave, least(x.va, 100000)::int from (values
    ('primeros-pasos',   (select count(*) from r)),
    ('primera-victoria', (select count(*) from gano)),
    ('noche-completa',   (select coalesce(max(n), 0) from (select count(*) n from r where evento is not null group by evento) t)),
    ('polifacetico',     (select count(distinct juego) from r)),
    ('estratega',        (select count(*) from gano where privado.es_deduccion(juego))),
    ('suertudo',         (select count(*) from gano where privado.es_azar(juego, datos))),
    ('mvp',              (select count(*) from r where cuenta and mvp)),
    ('imparable',        (select n from racha)),
    ('veterano',         (select count(*) from r)),
    ('ya-eres-parte',    (select count(*) from otros)),
    ('casa-llena',       (select count(*) from r where unidades = 8 or (select count(*) from public.resultados_partida o where o.partida = r.partida) >= 8)),
    ('popular',          (select count(*) from otros)),
    ('dupla',            (select coalesce(max(n), 0) from (select count(*) n from gano where modalidad = 'parejas' and grupo is not null group by grupo) t)),
    ('los-de-siempre',   (select coalesce(max(n), 0) from (select count(*) n from r where modalidad = 'equipos' and grupo is not null group by grupo) t)),
    ('campeon-noche',    (select count(*) from public.copas_noche c where c.jugador = p_jugador and c.categoria = 'individual' and c.lugar = 1)),
    ('campeon',          (select count(*) from public.torneo_campeones c where c.jugador = p_jugador)),
    ('cara-de-poker',    (select count(*) from gano where juego = 'impostor' and datos -> 'impostor' = 'true'::jsonb)),
    ('detective',        (select coalesce(sum((datos ->> 'votoImpostor')::int), 0) from r where juego = 'impostor' and jsonb_typeof(datos -> 'votoImpostor') = 'number')),
    ('valiente',         (select coalesce(sum((datos ->> 'reto')::int), 0) from r where juego = 'verdad-reto' and jsonb_typeof(datos -> 'reto') = 'number')),
    ('remontada',        (select count(*) from gano where unidades >= 3 and jsonb_typeof(datos -> 'peorLugar') = 'number' and (datos ->> 'peorLugar')::int >= unidades)),
    ('sospechoso',       (select count(*) from r where juego = 'impostor' and coalesce(datos -> 'impostor' <> 'true'::jsonb, true)
                            and jsonb_typeof(datos -> 'votosRecibidos') = 'number' and (datos ->> 'votosRecibidos')::int > 0)),
    ('intocable',        (select count(*) from gano where juego = 'impostor' and datos -> 'impostor' = 'true'::jsonb)),
    ('noctambulo',       (select count(*) from r where extract(hour from creada at time zone 'America/Mexico_City') between 3 and 4)),
    ('caos',             (select count(*) from (select evento from gano where evento is not null group by evento
                            having bool_or(privado.es_azar(juego, datos)) and bool_or(privado.es_deduccion(juego)) and bool_or(modalidad in ('equipos', 'sexos'))) t)),
    ('leyenda-local',    (select n from nivel)),
    ('alv-legendario',   (select n from nivel)),
    ('constante',        (select count(*) from public.objetivos_jugador j where j.jugador = p_jugador)),
    -- 055: ALV PARTY.
    ('pistolero',        (select count(*) from gano where juego = 'mj-desenfunda')),
    ('a-prueba-de-balas', (select count(*) from gano where juego = 'mj-bala')),
    ('mano-de-piedra',   (select count(*) from gano where juego = 'mj-martillazo')),
    ('aterrizaje-perfecto', (select count(*) from gano where juego = 'mj-paracaidas')),
    ('sangre-fria',      (select count(*) from gano where juego = 'mj-alto-total')),
    ('alma-de-la-party', (select count(distinct juego) from r where juego in ('mj-bala', 'mj-desenfunda', 'mj-martillazo', 'mj-alto-total', 'mj-paracaidas')))
  ) x(clave, va) $$;
