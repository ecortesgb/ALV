-- 057 · «Entrar sin cuenta» también crea una cuenta UsuarioN con contraseña aleatoria (pedido de Elías, 27 nov 2026).
-- Desde la pantalla de acceso todavía no hay sesión, así que siguiente_usuario() se abre también a anon.
-- Solo devuelve un número (el siguiente UsuarioN libre); no expone correos ni ids.
-- crear_cuenta_rapida sigue igual: pide la sesión de la cuenta usuarioN recién creada (15 min).

create or replace function public.siguiente_usuario()
returns integer language plpgsql stable security definer set search_path to '' as $$
begin
  return coalesce((select max((substring(u.email from '^usuario([0-9]{1,6})@jugadores\.alv\.invalid$'))::integer)
                   from auth.users u where u.email ~ '^usuario[0-9]{1,6}@jugadores\.alv\.invalid$'), 0) + 1;
end $$;
revoke all on function public.siguiente_usuario() from public;
grant execute on function public.siguiente_usuario() to anon, authenticated;
