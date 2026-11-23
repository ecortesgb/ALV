-- Biblioteca de Minifig Studio (aplicada el 2026-11-14 desde otro hilo; no estaba en el repo). Recuperada de la base vieja
-- el 2026-11-22 y aplicada igual en el proyecto nuevo ngwxxptydgbhkyznjngt. La app ALV no la usa.
create schema if not exists biblioteca;

create table if not exists biblioteca.colecciones (
  id          text primary key,
  nombre      text not null,
  grupo       text not null default 'Mis colecciones',
  apps        text[] not null default '{}',
  version     integer not null default 1,
  actualizado timestamptz not null default now()
);

create table if not exists biblioteca.piezas (
  id          text primary key,
  categoria   text not null,
  clave       text not null,
  nombre      text not null,
  ldraw       text,
  ldraw_par   text[],
  fuente      text not null default 'ldraw',
  licencia    text,
  datos       jsonb not null default '{}',
  version     integer not null default 1,
  actualizado timestamptz not null default now(),
  unique (categoria, clave)
);

create table if not exists biblioteca.estampados (
  id          text primary key,
  categoria   text not null,
  clave       text not null,
  nombre      text not null,
  aplica_a    text references biblioteca.piezas(id),
  tipo        text not null default 'dibujo',
  archivo     text,
  actualizado timestamptz not null default now(),
  unique (categoria, clave)
);

create table if not exists biblioteca.personajes (
  id           text primary key,
  nombre       text not null,
  coleccion_id text not null references biblioteca.colecciones(id) on update cascade,
  piezas       jsonb not null,
  extensiones  jsonb not null default '{}',
  origen       jsonb not null default '{}',
  version      integer not null default 1,
  actualizado  timestamptz not null default now()
);
create index if not exists personajes_coleccion on biblioteca.personajes(coleccion_id);

create table if not exists biblioteca.publicaciones (
  id           bigserial primary key,
  coleccion_id text not null references biblioteca.colecciones(id),
  app          text not null,
  version      integer not null,
  manifest     jsonb not null,
  publicado    timestamptz not null default now()
);
create index if not exists publicaciones_coleccion on biblioteca.publicaciones(coleccion_id);

alter table biblioteca.colecciones   enable row level security;
alter table biblioteca.piezas        enable row level security;
alter table biblioteca.estampados    enable row level security;
alter table biblioteca.personajes    enable row level security;
alter table biblioteca.publicaciones enable row level security;
create policy "lectura publica" on biblioteca.colecciones   for select using (true);
create policy "lectura publica" on biblioteca.piezas        for select using (true);
create policy "lectura publica" on biblioteca.estampados    for select using (true);
create policy "lectura publica" on biblioteca.personajes    for select using (true);
create policy "lectura publica" on biblioteca.publicaciones for select using (true);
grant usage on schema biblioteca to anon, authenticated;
grant select on all tables in schema biblioteca to anon, authenticated;
grant usage on schema biblioteca to service_role;
grant all on all tables in schema biblioteca to service_role;
grant all on all sequences in schema biblioteca to service_role;

insert into storage.buckets (id, name, public) values ('biblioteca', 'biblioteca', true) on conflict (id) do nothing;
