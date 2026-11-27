-- 047 · Personajes privados para toda cuenta registrada (Elías, 26 nov 2026: «A toda cuenta registrada»).
-- APLICADA en ngwxxptydgbhkyznjngt el 2026-11-27 03:35 UTC (apply_migration). Probada: cuenta registrada nueva sí; cuenta sin perfil no; anon no puede ejecutarla. Asesor sin avisos nuevos.
-- Antes (045) solo bajaban los personajes las cuentas de `privado.acceso_personajes` y los administradores; una cuenta
-- nueva veía «No se pudieron cargar los personajes». Ahora basta con ser cuenta registrada (no invitada) y mayor de edad.
-- Invitados, menores y anon siguen sin nada. La lista y sus funciones de administrador se quedan (sin efecto por ahora),
-- para volver a la regla anterior sin migrar datos.
-- Reversión: volver a crear la función como en 045 (sección 1).

/** ¿La cuenta con sesión puede bajar personajes privados? Cuenta registrada (no invitada) y mayor de edad. */
create or replace function public.puedo_ver_personajes()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.mayor_18 and not p.invitado);
$$;
revoke all on function public.puedo_ver_personajes() from public, anon;
grant execute on function public.puedo_ver_personajes() to authenticated;
