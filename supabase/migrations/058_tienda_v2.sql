-- 058 · Tienda v2 (Elías, 28 nov 2026, Maestro v1.73). Requiere 050, 051, 052 y 056.
-- 1) Catálogo de personajes al día: 232 personajes; 23 básicos libres y los demás en venta con rareza nueva
--    (114 raras, 73 épicas, 22 legendarias). Las sagas ya no se limitan a 4. Igual que src/content/personajesTienda.ts.
-- 2) Cartas de accesorio: el casco o sombrero y el accesorio de cada traje bloqueado se pueden conseguir sueltos
--    (183 cartas, rareza de su personaje). Se compran directo (rara 90, épica 130, legendaria 180) o salen en sobres.
-- 3) Comodines: se compran directo al precio de su carta aunque nunca hayan salido en un sobre (tope 9 copias).
-- 4) Sobres nuevos (abrir_sobre_alv): de 1 a 3 cartas, cualquier personaje de cualquier saga, sin repetir lo que ya
--    tienes. Básico 60 (1 al azar), Accesorios 120 (2), Comodines 150 (3), Personajes 180 (2), Mixto 200 (personaje,
--    accesorio y comodín), Épico 380 (3 personajes, mínimo una épica). Igual que src/content/tienda.ts.
-- 5) Administradores con monedas ilimitadas para probar: su saldo siempre es 999 999.
-- Quien ya guardó una figura con un personaje que ahora se bloquea, lo conserva (regalo).

-- 1) Personajes
alter table privado.catalogo_tienda_personajes drop constraint if exists catalogo_tienda_personajes_saga_check;
alter table privado.catalogo_tienda_personajes add constraint catalogo_tienda_personajes_saga_check check (saga ~ '^[a-z0-9-]+$');
-- generado: personajes
insert into privado.catalogo_tienda_personajes (id, saga, rareza, bigfig) values
  ('abominacion', 'marvel', 'epica', true),
  ('anakin-skywalker', 'star-wars', 'epica', false),
  ('animal', 'muppets', 'rara', false),
  ('ant-man', 'marvel', 'rara', false),
  ('antorcha-humana', 'marvel', 'rara', false),
  ('aquaman', 'dc', 'rara', false),
  ('arcangel', 'marvel', 'rara', false),
  ('arnim-zola', 'marvel', 'rara', false),
  ('avispa', 'marvel', 'rara', false),
  ('bart-simpson', 'simpsons', 'rara', false),
  ('batgirl', 'dc', 'rara', false),
  ('batman-excalibur', 'dc', 'epica', false),
  ('batman-gris-claro', 'dc', 'epica', false),
  ('batman-gris-oscuro', 'dc', 'epica', false),
  ('batman-logo-amarillo', 'dc', 'epica', false),
  ('batman-logo-dorado', 'dc', 'legendaria', false),
  ('batman-returns', 'dc', 'epica', false),
  ('baymax', 'disney', 'epica', false),
  ('bellatrix-lestrange', 'harry-potter', 'epica', false),
  ('bellota', 'chicas-superpoderosas', 'rara', false),
  ('bestia', 'marvel', 'rara', false),
  ('black-panther', 'marvel', 'epica', false),
  ('black-widow', 'marvel', 'rara', false),
  ('blade', 'marvel', 'rara', false),
  ('bombon', 'chicas-superpoderosas', 'rara', false),
  ('bruce-banner', 'marvel', 'rara', false),
  ('bruce-wayne', 'dc', 'rara', false),
  ('bruja-malvada', 'mago-de-oz', 'epica', false),
  ('buitre', 'marvel', 'rara', false),
  ('bullseye', 'marvel', 'rara', false),
  ('burbuja', 'chicas-superpoderosas', 'rara', false),
  ('c-3po', 'star-wars', 'epica', false),
  ('capitan-america', 'marvel', 'rara', false),
  ('capitan-britania', 'marvel', 'rara', false),
  ('carnage', 'marvel', 'epica', false),
  ('chica-ardilla', 'marvel', 'rara', false),
  ('chico-bestia', 'dc', 'rara', false),
  ('coloso', 'marvel', 'epica', true),
  ('coulson', 'marvel', 'rara', false),
  ('coyote', 'looney-tunes', 'rara', false),
  ('craneo-rojo', 'marvel', 'rara', false),
  ('cristiano-ronaldo-madrid-2018', 'futbol', 'legendaria', false),
  ('cristiano-ronaldo-united-2008', 'futbol', 'epica', false),
  ('cyborg', 'dc', 'rara', false),
  ('daisy', 'disney', 'rara', false),
  ('daredevil', 'marvel', 'rara', false),
  ('darth-maul', 'star-wars', 'legendaria', false),
  ('darth-vader-minifig', 'star-wars', 'epica', false),
  ('deadpool', 'marvel', 'epica', false),
  ('dientes-de-sable', 'marvel', 'rara', false),
  ('doc-brown', 'volver-al-futuro', 'epica', false),
  ('doctor-doom', 'marvel', 'legendaria', false),
  ('doctor-octopus', 'marvel', 'rara', false),
  ('doctor-strange', 'marvel', 'epica', false),
  ('drax', 'marvel', 'rara', false),
  ('duende-verde', 'marvel', 'rara', false),
  ('duende-verde-ultimate', 'marvel', 'epica', true),
  ('edna-moda', 'disney', 'epica', false),
  ('el-lider', 'marvel', 'rara', false),
  ('electro', 'marvel', 'rara', false),
  ('elektra', 'marvel', 'rara', false),
  ('elsa', 'disney', 'legendaria', false),
  ('emma-frost', 'marvel', 'rara', false),
  ('emperador-palpatine', 'star-wars', 'legendaria', false),
  ('et', 'et', 'epica', false),
  ('falcon', 'marvel', 'rara', false),
  ('fenix', 'marvel', 'epica', false),
  ('fenix-oscura', 'marvel', 'legendaria', false),
  ('finn', 'hora-de-aventura', 'rara', false),
  ('flash', 'dc', 'rara', false),
  ('fozzie', 'muppets', 'rara', false),
  ('gambito', 'marvel', 'rara', false),
  ('gamora', 'marvel', 'epica', false),
  ('gata-negra', 'marvel', 'rara', false),
  ('ghost-rider', 'marvel', 'legendaria', false),
  ('gizmo', 'gremlins', 'epica', false),
  ('groot', 'marvel', 'epica', true),
  ('gwen-stacy', 'marvel', 'rara', false),
  ('han-solo', 'star-wars', 'epica', false),
  ('harley-quinn', 'dc', 'epica', false),
  ('harry-potter-chamarra-abierta', 'harry-potter', 'epica', false),
  ('harry-potter-chamarra-azul', 'harry-potter', 'epica', false),
  ('harry-potter-dimensions', 'harry-potter', 'epica', false),
  ('harry-potter-quidditch', 'harry-potter', 'epica', false),
  ('havok', 'marvel', 'rara', false),
  ('hawkeye', 'marvel', 'rara', false),
  ('heimdall', 'marvel', 'rara', false),
  ('hermione-chamarra', 'harry-potter', 'epica', false),
  ('hombre-absorbente', 'marvel', 'rara', false),
  ('hombre-de-arena', 'marvel', 'rara', false),
  ('homelander', 'the-boys', 'legendaria', false),
  ('howard-el-pato', 'marvel', 'rara', false),
  ('hulk-rojo', 'marvel', 'epica', true),
  ('hulkbuster', 'marvel', 'legendaria', true),
  ('iceman', 'marvel', 'rara', false),
  ('iron-fist', 'marvel', 'rara', false),
  ('iron-man', 'marvel', 'rara', false),
  ('iron-man-mk42', 'marvel', 'legendaria', false),
  ('iron-man-mk42-minifig', 'marvel', 'epica', false),
  ('iron-man-mk6', 'marvel', 'epica', false),
  ('iron-patriot', 'marvel', 'rara', false),
  ('iron-spider', 'marvel', 'epica', false),
  ('jack-sparrow', 'disney', 'legendaria', false),
  ('jake', 'hora-de-aventura', 'rara', false),
  ('jane-foster', 'marvel', 'rara', false),
  ('jango-fett', 'star-wars', 'epica', false),
  ('jean-grey', 'marvel', 'rara', false),
  ('joker', 'dc', 'rara', false),
  ('joker-caballero-oscuro', 'dc', 'legendaria', false),
  ('joker-clasico', 'dc', 'epica', false),
  ('juggernaut', 'marvel', 'epica', true),
  ('kingpin', 'marvel', 'epica', true),
  ('kraven', 'marvel', 'rara', false),
  ('krusty', 'simpsons', 'epica', false),
  ('kylian-mbappe', 'futbol', 'epica', false),
  ('la-mole', 'marvel', 'epica', true),
  ('lagarto', 'marvel', 'epica', true),
  ('loki', 'marvel', 'epica', false),
  ('loki-minifig', 'marvel', 'epica', false),
  ('lola-bunny', 'looney-tunes', 'rara', false),
  ('mace-windu', 'star-wars', 'legendaria', false),
  ('magneto', 'marvel', 'legendaria', false),
  ('malekith', 'marvel', 'rara', false),
  ('mandaloriano', 'star-wars', 'epica', false),
  ('mandarin', 'marvel', 'rara', false),
  ('marceline', 'hora-de-aventura', 'epica', false),
  ('marge-simpson', 'simpsons', 'rara', false),
  ('maria-hill', 'marvel', 'rara', false),
  ('marty-mcfly', 'volver-al-futuro', 'epica', false),
  ('marvin-marciano', 'looney-tunes', 'epica', false),
  ('mary-jane', 'marvel', 'rara', false),
  ('miles-morales', 'marvel', 'epica', false),
  ('minnie-mouse', 'disney', 'rara', false),
  ('miss-piggy', 'muppets', 'rara', false),
  ('mistica', 'marvel', 'rara', false),
  ('moana', 'disney', 'rara', false),
  ('modok', 'marvel', 'rara', false),
  ('monstruo-galletas', 'plaza-sesamo', 'epica', false),
  ('moon-knight', 'marvel', 'rara', false),
  ('mr-fantastico', 'marvel', 'rara', false),
  ('mr-increible', 'disney', 'epica', false),
  ('ms-marvel', 'marvel', 'rara', false),
  ('mujer-invisible', 'marvel', 'rara', false),
  ('mujer-maravilla-clasica', 'dc', 'epica', false),
  ('mysterio', 'marvel', 'rara', false),
  ('ned-flanders', 'simpsons', 'rara', false),
  ('nick-fury', 'marvel', 'rara', false),
  ('nova', 'marvel', 'rara', false),
  ('odin', 'marvel', 'rara', false),
  ('omni-man', 'invincible', 'legendaria', false),
  ('pato-donald', 'disney', 'rara', false),
  ('pato-lucas', 'looney-tunes', 'rara', false),
  ('pedro-picapiedra', 'picapiedra', 'rara', false),
  ('pepper-potts', 'marvel', 'rara', false),
  ('piolin', 'looney-tunes', 'rara', false),
  ('polaris', 'marvel', 'rara', false),
  ('profesor-x', 'marvel', 'rara', false),
  ('psylocke', 'marvel', 'rara', false),
  ('punisher', 'marvel', 'rara', false),
  ('pyro', 'marvel', 'rara', false),
  ('raven', 'dc', 'rara', false),
  ('rescue', 'marvel', 'rara', false),
  ('rino', 'marvel', 'epica', true),
  ('robin', 'dc', 'rara', false),
  ('robin-dimensions', 'dc', 'epica', false),
  ('robin-lego-batman', 'dc', 'rara', false),
  ('rocket', 'marvel', 'epica', false),
  ('ronan', 'marvel', 'rara', false),
  ('sapo', 'marvel', 'rara', false),
  ('shaggy', 'scooby-doo', 'rara', false),
  ('she-hulk', 'marvel', 'rara', false),
  ('sheldon-cooper', 'big-bang-theory', 'epica', false),
  ('shocker', 'marvel', 'rara', false),
  ('sif', 'marvel', 'rara', false),
  ('silver-surfer', 'marvel', 'legendaria', false),
  ('silvestre', 'looney-tunes', 'rara', false),
  ('soldado-del-invierno', 'marvel', 'rara', false),
  ('soldado-del-invierno-minifig', 'marvel', 'epica', false),
  ('sonic', 'sonic', 'legendaria', false),
  ('speedy-gonzalez', 'looney-tunes', 'rara', false),
  ('spider-gwen', 'marvel', 'epica', false),
  ('spider-man-minifig', 'marvel', 'epica', false),
  ('spider-man-negro', 'marvel', 'epica', false),
  ('spider-man-simbionte', 'marvel', 'epica', false),
  ('spider-woman', 'marvel', 'rara', false),
  ('stan-lee', 'marvel', 'rara', false),
  ('star-lord', 'marvel', 'epica', false),
  ('starfire', 'dc', 'rara', false),
  ('super-skrull', 'marvel', 'rara', false),
  ('superior-spider-man', 'marvel', 'rara', false),
  ('superman-ojos-rojos', 'dc', 'legendaria', false),
  ('taskmaster', 'marvel', 'rara', false),
  ('taz', 'looney-tunes', 'epica', false),
  ('thanos', 'marvel', 'legendaria', true),
  ('thor-minifig', 'marvel', 'epica', false),
  ('tia-may', 'marvel', 'rara', false),
  ('tony-stark', 'marvel', 'rara', false),
  ('tormenta-minifig', 'marvel', 'epica', false),
  ('union-jack', 'marvel', 'rara', false),
  ('vampiro', 'monstruos', 'epica', false),
  ('venom', 'marvel', 'epica', false),
  ('venom-grande', 'marvel', 'legendaria', true),
  ('vinicius-junior', 'futbol', 'epica', false),
  ('viper', 'marvel', 'rara', false),
  ('voldemort', 'harry-potter', 'legendaria', false),
  ('voldemort-dimensions', 'harry-potter', 'epica', false),
  ('war-machine', 'marvel', 'rara', false),
  ('whiplash', 'marvel', 'rara', false),
  ('wolverine-mascara', 'marvel', 'epica', false)
on conflict (id) do update set saga = excluded.saga, rareza = excluded.rareza, bigfig = excluded.bigfig, activo = true;
-- fin generado
-- Los básicos no se venden (si alguno estaba en venta, se apaga; quien lo compró lo conserva).
update privado.catalogo_tienda_personajes set activo = false where id in ('batman', 'bugs-bunny', 'capitan-america-clasico', 'ciclope', 'cristiano-ronaldo', 'darth-vader', 'harry-potter', 'hermione-granger', 'homero-simpson', 'hulk', 'iron-man-clasico', 'lionel-messi', 'luke-skywalker', 'mickey-mouse', 'mujer-maravilla', 'peter-parker', 'ron-weasley', 'spider-man', 'superman', 'thor', 'tormenta', 'wolverine', 'yoda');

insert into privado.grupo_personaje (id, saga, grupo) values
  ('abominacion', 'marvel', 'villanos-marvel'),
  ('anakin-skywalker', 'star-wars', 'star-wars'),
  ('animal', 'muppets', 'muppets'),
  ('ant-man', 'marvel', 'avengers'),
  ('antorcha-humana', 'marvel', 'otros-marvel'),
  ('aquaman', 'dc', 'dc'),
  ('arcangel', 'marvel', 'x-men'),
  ('arnim-zola', 'marvel', 'villanos-marvel'),
  ('avispa', 'marvel', 'avengers'),
  ('bart-simpson', 'simpsons', 'simpsons'),
  ('batgirl', 'dc', 'dc'),
  ('batman', 'dc', 'dc'),
  ('batman-excalibur', 'dc', 'dc'),
  ('batman-gris-claro', 'dc', 'dc'),
  ('batman-gris-oscuro', 'dc', 'dc'),
  ('batman-logo-amarillo', 'dc', 'dc'),
  ('batman-logo-dorado', 'dc', 'dc'),
  ('batman-returns', 'dc', 'dc'),
  ('baymax', 'disney', 'disney'),
  ('bellatrix-lestrange', 'harry-potter', 'harry-potter'),
  ('bellota', 'chicas-superpoderosas', 'chicas-superpoderosas'),
  ('bestia', 'marvel', 'x-men'),
  ('black-panther', 'marvel', 'avengers'),
  ('black-widow', 'marvel', 'avengers'),
  ('blade', 'marvel', 'otros-marvel'),
  ('bombon', 'chicas-superpoderosas', 'chicas-superpoderosas'),
  ('bruce-banner', 'marvel', 'avengers'),
  ('bruce-wayne', 'dc', 'dc'),
  ('bruja-malvada', 'mago-de-oz', 'mago-de-oz'),
  ('bugs-bunny', 'looney-tunes', 'looney-tunes'),
  ('buitre', 'marvel', 'villanos-marvel'),
  ('bullseye', 'marvel', 'villanos-marvel'),
  ('burbuja', 'chicas-superpoderosas', 'chicas-superpoderosas'),
  ('c-3po', 'star-wars', 'star-wars'),
  ('capitan-america', 'marvel', 'avengers'),
  ('capitan-america-clasico', 'marvel', 'avengers'),
  ('capitan-britania', 'marvel', 'otros-marvel'),
  ('carnage', 'marvel', 'villanos-marvel'),
  ('chica-ardilla', 'marvel', 'otros-marvel'),
  ('chico-bestia', 'dc', 'dc'),
  ('ciclope', 'marvel', 'x-men'),
  ('coloso', 'marvel', 'x-men'),
  ('coulson', 'marvel', 'avengers'),
  ('coyote', 'looney-tunes', 'looney-tunes'),
  ('craneo-rojo', 'marvel', 'villanos-marvel'),
  ('cristiano-ronaldo', 'futbol', 'futbol'),
  ('cristiano-ronaldo-madrid-2018', 'futbol', 'futbol'),
  ('cristiano-ronaldo-united-2008', 'futbol', 'futbol'),
  ('cyborg', 'dc', 'dc'),
  ('daisy', 'disney', 'disney'),
  ('daredevil', 'marvel', 'otros-marvel'),
  ('darth-maul', 'star-wars', 'star-wars'),
  ('darth-vader', 'star-wars', 'star-wars'),
  ('darth-vader-minifig', 'star-wars', 'star-wars'),
  ('deadpool', 'marvel', 'otros-marvel'),
  ('dientes-de-sable', 'marvel', 'villanos-marvel'),
  ('doc-brown', 'volver-al-futuro', 'volver-al-futuro'),
  ('doctor-doom', 'marvel', 'villanos-marvel'),
  ('doctor-octopus', 'marvel', 'villanos-marvel'),
  ('doctor-strange', 'marvel', 'avengers'),
  ('drax', 'marvel', 'guardianes'),
  ('duende-verde', 'marvel', 'villanos-marvel'),
  ('duende-verde-ultimate', 'marvel', 'villanos-marvel'),
  ('edna-moda', 'disney', 'disney'),
  ('el-lider', 'marvel', 'villanos-marvel'),
  ('electro', 'marvel', 'villanos-marvel'),
  ('elektra', 'marvel', 'otros-marvel'),
  ('elsa', 'disney', 'disney'),
  ('emma-frost', 'marvel', 'x-men'),
  ('emperador-palpatine', 'star-wars', 'star-wars'),
  ('et', 'et', 'et'),
  ('falcon', 'marvel', 'avengers'),
  ('fenix', 'marvel', 'x-men'),
  ('fenix-oscura', 'marvel', 'x-men'),
  ('finn', 'hora-de-aventura', 'hora-de-aventura'),
  ('flash', 'dc', 'dc'),
  ('fozzie', 'muppets', 'muppets'),
  ('gambito', 'marvel', 'x-men'),
  ('gamora', 'marvel', 'guardianes'),
  ('gata-negra', 'marvel', 'otros-marvel'),
  ('ghost-rider', 'marvel', 'otros-marvel'),
  ('gizmo', 'gremlins', 'gremlins'),
  ('groot', 'marvel', 'guardianes'),
  ('gwen-stacy', 'marvel', 'otros-marvel'),
  ('han-solo', 'star-wars', 'star-wars'),
  ('harley-quinn', 'dc', 'dc'),
  ('harry-potter', 'harry-potter', 'harry-potter'),
  ('harry-potter-chamarra-abierta', 'harry-potter', 'harry-potter'),
  ('harry-potter-chamarra-azul', 'harry-potter', 'harry-potter'),
  ('harry-potter-dimensions', 'harry-potter', 'harry-potter'),
  ('harry-potter-quidditch', 'harry-potter', 'harry-potter'),
  ('havok', 'marvel', 'x-men'),
  ('hawkeye', 'marvel', 'avengers'),
  ('heimdall', 'marvel', 'otros-marvel'),
  ('hermione-chamarra', 'harry-potter', 'harry-potter'),
  ('hermione-granger', 'harry-potter', 'harry-potter'),
  ('hombre-absorbente', 'marvel', 'villanos-marvel'),
  ('hombre-de-arena', 'marvel', 'villanos-marvel'),
  ('homelander', 'the-boys', 'the-boys'),
  ('homero-simpson', 'simpsons', 'simpsons'),
  ('howard-el-pato', 'marvel', 'otros-marvel'),
  ('hulk', 'marvel', 'avengers'),
  ('hulk-rojo', 'marvel', 'otros-marvel'),
  ('hulkbuster', 'marvel', 'avengers'),
  ('iceman', 'marvel', 'x-men'),
  ('iron-fist', 'marvel', 'otros-marvel'),
  ('iron-man', 'marvel', 'avengers'),
  ('iron-man-clasico', 'marvel', 'avengers'),
  ('iron-man-mk42', 'marvel', 'avengers'),
  ('iron-man-mk42-minifig', 'marvel', 'marvel'),
  ('iron-man-mk6', 'marvel', 'marvel'),
  ('iron-patriot', 'marvel', 'avengers'),
  ('iron-spider', 'marvel', 'otros-marvel'),
  ('jack-sparrow', 'disney', 'disney'),
  ('jake', 'hora-de-aventura', 'hora-de-aventura'),
  ('jane-foster', 'marvel', 'otros-marvel'),
  ('jango-fett', 'star-wars', 'star-wars'),
  ('jean-grey', 'marvel', 'x-men'),
  ('joker', 'dc', 'dc'),
  ('joker-caballero-oscuro', 'dc', 'dc'),
  ('joker-clasico', 'dc', 'dc'),
  ('juggernaut', 'marvel', 'villanos-marvel'),
  ('kingpin', 'marvel', 'villanos-marvel'),
  ('kraven', 'marvel', 'villanos-marvel'),
  ('krusty', 'simpsons', 'simpsons'),
  ('kylian-mbappe', 'futbol', 'futbol'),
  ('la-mole', 'marvel', 'otros-marvel'),
  ('lagarto', 'marvel', 'villanos-marvel'),
  ('lionel-messi', 'futbol', 'futbol'),
  ('loki', 'marvel', 'villanos-marvel'),
  ('loki-minifig', 'marvel', 'marvel'),
  ('lola-bunny', 'looney-tunes', 'looney-tunes'),
  ('luke-skywalker', 'star-wars', 'star-wars'),
  ('mace-windu', 'star-wars', 'star-wars'),
  ('magneto', 'marvel', 'villanos-marvel'),
  ('malekith', 'marvel', 'villanos-marvel'),
  ('mandaloriano', 'star-wars', 'star-wars'),
  ('mandarin', 'marvel', 'villanos-marvel'),
  ('marceline', 'hora-de-aventura', 'hora-de-aventura'),
  ('marge-simpson', 'simpsons', 'simpsons'),
  ('maria-hill', 'marvel', 'avengers'),
  ('marty-mcfly', 'volver-al-futuro', 'volver-al-futuro'),
  ('marvin-marciano', 'looney-tunes', 'looney-tunes'),
  ('mary-jane', 'marvel', 'otros-marvel'),
  ('mickey-mouse', 'disney', 'disney'),
  ('miles-morales', 'marvel', 'marvel'),
  ('minnie-mouse', 'disney', 'disney'),
  ('miss-piggy', 'muppets', 'muppets'),
  ('mistica', 'marvel', 'villanos-marvel'),
  ('moana', 'disney', 'disney'),
  ('modok', 'marvel', 'villanos-marvel'),
  ('monstruo-galletas', 'plaza-sesamo', 'plaza-sesamo'),
  ('moon-knight', 'marvel', 'otros-marvel'),
  ('mr-fantastico', 'marvel', 'otros-marvel'),
  ('mr-increible', 'disney', 'disney'),
  ('ms-marvel', 'marvel', 'avengers'),
  ('mujer-invisible', 'marvel', 'otros-marvel'),
  ('mujer-maravilla', 'dc', 'dc'),
  ('mujer-maravilla-clasica', 'dc', 'dc'),
  ('mysterio', 'marvel', 'villanos-marvel'),
  ('ned-flanders', 'simpsons', 'simpsons'),
  ('nick-fury', 'marvel', 'avengers'),
  ('nova', 'marvel', 'guardianes'),
  ('odin', 'marvel', 'otros-marvel'),
  ('omni-man', 'invincible', 'invincible'),
  ('pato-donald', 'disney', 'disney'),
  ('pato-lucas', 'looney-tunes', 'looney-tunes'),
  ('pedro-picapiedra', 'picapiedra', 'picapiedra'),
  ('pepper-potts', 'marvel', 'otros-marvel'),
  ('peter-parker', 'marvel', 'otros-marvel'),
  ('piolin', 'looney-tunes', 'looney-tunes'),
  ('polaris', 'marvel', 'x-men'),
  ('profesor-x', 'marvel', 'x-men'),
  ('psylocke', 'marvel', 'x-men'),
  ('punisher', 'marvel', 'otros-marvel'),
  ('pyro', 'marvel', 'villanos-marvel'),
  ('raven', 'dc', 'dc'),
  ('rescue', 'marvel', 'avengers'),
  ('rino', 'marvel', 'villanos-marvel'),
  ('robin', 'dc', 'dc'),
  ('robin-dimensions', 'dc', 'dc'),
  ('robin-lego-batman', 'dc', 'dc'),
  ('rocket', 'marvel', 'guardianes'),
  ('ron-weasley', 'harry-potter', 'harry-potter'),
  ('ronan', 'marvel', 'villanos-marvel'),
  ('sapo', 'marvel', 'villanos-marvel'),
  ('shaggy', 'scooby-doo', 'scooby-doo'),
  ('she-hulk', 'marvel', 'avengers'),
  ('sheldon-cooper', 'big-bang-theory', 'big-bang-theory'),
  ('shocker', 'marvel', 'villanos-marvel'),
  ('sif', 'marvel', 'otros-marvel'),
  ('silver-surfer', 'marvel', 'otros-marvel'),
  ('silvestre', 'looney-tunes', 'looney-tunes'),
  ('soldado-del-invierno', 'marvel', 'otros-marvel'),
  ('soldado-del-invierno-minifig', 'marvel', 'marvel'),
  ('sonic', 'sonic', 'sonic'),
  ('speedy-gonzalez', 'looney-tunes', 'looney-tunes'),
  ('spider-gwen', 'marvel', 'marvel'),
  ('spider-man', 'marvel', 'otros-marvel'),
  ('spider-man-minifig', 'marvel', 'marvel'),
  ('spider-man-negro', 'marvel', 'otros-marvel'),
  ('spider-man-simbionte', 'marvel', 'marvel'),
  ('spider-woman', 'marvel', 'avengers'),
  ('stan-lee', 'marvel', 'otros-marvel'),
  ('star-lord', 'marvel', 'guardianes'),
  ('starfire', 'dc', 'dc'),
  ('super-skrull', 'marvel', 'villanos-marvel'),
  ('superior-spider-man', 'marvel', 'otros-marvel'),
  ('superman', 'dc', 'dc'),
  ('superman-ojos-rojos', 'dc', 'dc'),
  ('taskmaster', 'marvel', 'villanos-marvel'),
  ('taz', 'looney-tunes', 'looney-tunes'),
  ('thanos', 'marvel', 'villanos-marvel'),
  ('thor', 'marvel', 'avengers'),
  ('thor-minifig', 'marvel', 'marvel'),
  ('tia-may', 'marvel', 'otros-marvel'),
  ('tony-stark', 'marvel', 'avengers'),
  ('tormenta', 'marvel', 'x-men'),
  ('tormenta-minifig', 'marvel', 'marvel'),
  ('union-jack', 'marvel', 'otros-marvel'),
  ('vampiro', 'monstruos', 'monstruos'),
  ('venom', 'marvel', 'villanos-marvel'),
  ('venom-grande', 'marvel', 'villanos-marvel'),
  ('vinicius-junior', 'futbol', 'futbol'),
  ('viper', 'marvel', 'villanos-marvel'),
  ('voldemort', 'harry-potter', 'harry-potter'),
  ('voldemort-dimensions', 'harry-potter', 'harry-potter'),
  ('war-machine', 'marvel', 'avengers'),
  ('whiplash', 'marvel', 'villanos-marvel'),
  ('wolverine', 'marvel', 'x-men'),
  ('wolverine-mascara', 'marvel', 'marvel'),
  ('yoda', 'star-wars', 'star-wars')
on conflict (id) do update set saga = excluded.saga, grupo = excluded.grupo;

-- Lo que ya se usa se conserva (igual que en 052): quien guardó una figura con un personaje que ahora se vende, lo tiene.
insert into privado.personajes_comprados (jugador, personaje, origen)
select distinct f.jugador, c.id, 'regalo'
from public.figuras_jugador f
cross join lateral jsonb_path_query(f.figura, 'strict $.**.origen ? (@.tipo == "catalogo").personaje') p(personaje)
join privado.catalogo_tienda_personajes c on c.id = p.personaje #>> '{}' and c.activo
join public.perfiles pf on pf.id = f.jugador
on conflict (jugador, personaje) do nothing;

-- 2) Accesorios
create table privado.accesorios_tienda (
  id      text primary key check (id ~ '^[a-z0-9-]+--(sombrero|accesorio)$'),
  donante text not null references privado.catalogo_tienda_personajes(id),
  parte   text not null check (parte in ('sombrero', 'accesorio')),
  activo  boolean not null default true
);
create table privado.accesorios_jugador (
  jugador uuid not null references public.perfiles(id) on delete cascade,
  pieza   text not null references privado.accesorios_tienda(id),
  origen  text not null check (origen in ('compra', 'sobre', 'regalo')),
  primary key (jugador, pieza)
);
revoke all on privado.accesorios_tienda, privado.accesorios_jugador from public, anon, authenticated;
alter table privado.accesorios_tienda enable row level security;
alter table privado.accesorios_jugador enable row level security;
-- generado: accesorios
insert into privado.accesorios_tienda (id, donante, parte) values
  ('anakin-skywalker--sombrero', 'anakin-skywalker', 'sombrero'),
  ('anakin-skywalker--accesorio', 'anakin-skywalker', 'accesorio'),
  ('animal--sombrero', 'animal', 'sombrero'),
  ('ant-man--sombrero', 'ant-man', 'sombrero'),
  ('aquaman--sombrero', 'aquaman', 'sombrero'),
  ('arcangel--accesorio', 'arcangel', 'accesorio'),
  ('arnim-zola--sombrero', 'arnim-zola', 'sombrero'),
  ('arnim-zola--accesorio', 'arnim-zola', 'accesorio'),
  ('avispa--accesorio', 'avispa', 'accesorio'),
  ('bart-simpson--sombrero', 'bart-simpson', 'sombrero'),
  ('batgirl--sombrero', 'batgirl', 'sombrero'),
  ('batgirl--accesorio', 'batgirl', 'accesorio'),
  ('batman-excalibur--sombrero', 'batman-excalibur', 'sombrero'),
  ('batman-excalibur--accesorio', 'batman-excalibur', 'accesorio'),
  ('batman-gris-claro--sombrero', 'batman-gris-claro', 'sombrero'),
  ('batman-gris-claro--accesorio', 'batman-gris-claro', 'accesorio'),
  ('batman-gris-oscuro--sombrero', 'batman-gris-oscuro', 'sombrero'),
  ('batman-gris-oscuro--accesorio', 'batman-gris-oscuro', 'accesorio'),
  ('batman-logo-amarillo--sombrero', 'batman-logo-amarillo', 'sombrero'),
  ('batman-logo-amarillo--accesorio', 'batman-logo-amarillo', 'accesorio'),
  ('batman-logo-dorado--sombrero', 'batman-logo-dorado', 'sombrero'),
  ('batman-logo-dorado--accesorio', 'batman-logo-dorado', 'accesorio'),
  ('batman-returns--sombrero', 'batman-returns', 'sombrero'),
  ('batman-returns--accesorio', 'batman-returns', 'accesorio'),
  ('baymax--sombrero', 'baymax', 'sombrero'),
  ('bellatrix-lestrange--sombrero', 'bellatrix-lestrange', 'sombrero'),
  ('bellota--sombrero', 'bellota', 'sombrero'),
  ('black-panther--sombrero', 'black-panther', 'sombrero'),
  ('black-panther--accesorio', 'black-panther', 'accesorio'),
  ('black-widow--accesorio', 'black-widow', 'accesorio'),
  ('blade--sombrero', 'blade', 'sombrero'),
  ('bombon--sombrero', 'bombon', 'sombrero'),
  ('bruce-wayne--sombrero', 'bruce-wayne', 'sombrero'),
  ('bruja-malvada--sombrero', 'bruja-malvada', 'sombrero'),
  ('bruja-malvada--accesorio', 'bruja-malvada', 'accesorio'),
  ('buitre--accesorio', 'buitre', 'accesorio'),
  ('burbuja--sombrero', 'burbuja', 'sombrero'),
  ('c-3po--sombrero', 'c-3po', 'sombrero'),
  ('capitan-america--sombrero', 'capitan-america', 'sombrero'),
  ('capitan-britania--sombrero', 'capitan-britania', 'sombrero'),
  ('carnage--accesorio', 'carnage', 'accesorio'),
  ('chico-bestia--sombrero', 'chico-bestia', 'sombrero'),
  ('coyote--sombrero', 'coyote', 'sombrero'),
  ('cristiano-ronaldo-madrid-2018--sombrero', 'cristiano-ronaldo-madrid-2018', 'sombrero'),
  ('cristiano-ronaldo-united-2008--sombrero', 'cristiano-ronaldo-united-2008', 'sombrero'),
  ('cyborg--sombrero', 'cyborg', 'sombrero'),
  ('daisy--sombrero', 'daisy', 'sombrero'),
  ('darth-maul--sombrero', 'darth-maul', 'sombrero'),
  ('darth-maul--accesorio', 'darth-maul', 'accesorio'),
  ('darth-vader-minifig--sombrero', 'darth-vader-minifig', 'sombrero'),
  ('darth-vader-minifig--accesorio', 'darth-vader-minifig', 'accesorio'),
  ('deadpool--accesorio', 'deadpool', 'accesorio'),
  ('dientes-de-sable--accesorio', 'dientes-de-sable', 'accesorio'),
  ('doc-brown--sombrero', 'doc-brown', 'sombrero'),
  ('doctor-doom--sombrero', 'doctor-doom', 'sombrero'),
  ('doctor-doom--accesorio', 'doctor-doom', 'accesorio'),
  ('doctor-octopus--sombrero', 'doctor-octopus', 'sombrero'),
  ('doctor-octopus--accesorio', 'doctor-octopus', 'accesorio'),
  ('doctor-strange--sombrero', 'doctor-strange', 'sombrero'),
  ('doctor-strange--accesorio', 'doctor-strange', 'accesorio'),
  ('duende-verde--sombrero', 'duende-verde', 'sombrero'),
  ('edna-moda--sombrero', 'edna-moda', 'sombrero'),
  ('electro--sombrero', 'electro', 'sombrero'),
  ('elsa--sombrero', 'elsa', 'sombrero'),
  ('elsa--accesorio', 'elsa', 'accesorio'),
  ('emma-frost--accesorio', 'emma-frost', 'accesorio'),
  ('emperador-palpatine--sombrero', 'emperador-palpatine', 'sombrero'),
  ('emperador-palpatine--accesorio', 'emperador-palpatine', 'accesorio'),
  ('et--sombrero', 'et', 'sombrero'),
  ('falcon--accesorio', 'falcon', 'accesorio'),
  ('finn--sombrero', 'finn', 'sombrero'),
  ('flash--sombrero', 'flash', 'sombrero'),
  ('fozzie--sombrero', 'fozzie', 'sombrero'),
  ('gamora--accesorio', 'gamora', 'accesorio'),
  ('gizmo--sombrero', 'gizmo', 'sombrero'),
  ('han-solo--sombrero', 'han-solo', 'sombrero'),
  ('harley-quinn--sombrero', 'harley-quinn', 'sombrero'),
  ('harry-potter-chamarra-abierta--sombrero', 'harry-potter-chamarra-abierta', 'sombrero'),
  ('harry-potter-chamarra-azul--sombrero', 'harry-potter-chamarra-azul', 'sombrero'),
  ('harry-potter-dimensions--sombrero', 'harry-potter-dimensions', 'sombrero'),
  ('harry-potter-quidditch--sombrero', 'harry-potter-quidditch', 'sombrero'),
  ('hawkeye--sombrero', 'hawkeye', 'sombrero'),
  ('heimdall--sombrero', 'heimdall', 'sombrero'),
  ('heimdall--accesorio', 'heimdall', 'accesorio'),
  ('hermione-chamarra--sombrero', 'hermione-chamarra', 'sombrero'),
  ('homelander--sombrero', 'homelander', 'sombrero'),
  ('homelander--accesorio', 'homelander', 'accesorio'),
  ('howard-el-pato--sombrero', 'howard-el-pato', 'sombrero'),
  ('iron-man--sombrero', 'iron-man', 'sombrero'),
  ('iron-man-mk42--sombrero', 'iron-man-mk42', 'sombrero'),
  ('iron-man-mk42-minifig--sombrero', 'iron-man-mk42-minifig', 'sombrero'),
  ('iron-man-mk6--sombrero', 'iron-man-mk6', 'sombrero'),
  ('iron-patriot--sombrero', 'iron-patriot', 'sombrero'),
  ('iron-patriot--accesorio', 'iron-patriot', 'accesorio'),
  ('jack-sparrow--sombrero', 'jack-sparrow', 'sombrero'),
  ('jake--sombrero', 'jake', 'sombrero'),
  ('jango-fett--sombrero', 'jango-fett', 'sombrero'),
  ('joker--sombrero', 'joker', 'sombrero'),
  ('joker-caballero-oscuro--sombrero', 'joker-caballero-oscuro', 'sombrero'),
  ('joker-clasico--sombrero', 'joker-clasico', 'sombrero'),
  ('krusty--sombrero', 'krusty', 'sombrero'),
  ('kylian-mbappe--sombrero', 'kylian-mbappe', 'sombrero'),
  ('loki--sombrero', 'loki', 'sombrero'),
  ('loki--accesorio', 'loki', 'accesorio'),
  ('loki-minifig--sombrero', 'loki-minifig', 'sombrero'),
  ('lola-bunny--sombrero', 'lola-bunny', 'sombrero'),
  ('mace-windu--sombrero', 'mace-windu', 'sombrero'),
  ('magneto--sombrero', 'magneto', 'sombrero'),
  ('magneto--accesorio', 'magneto', 'accesorio'),
  ('mandaloriano--sombrero', 'mandaloriano', 'sombrero'),
  ('mandaloriano--accesorio', 'mandaloriano', 'accesorio'),
  ('marceline--sombrero', 'marceline', 'sombrero'),
  ('marge-simpson--sombrero', 'marge-simpson', 'sombrero'),
  ('marty-mcfly--sombrero', 'marty-mcfly', 'sombrero'),
  ('marvin-marciano--sombrero', 'marvin-marciano', 'sombrero'),
  ('miles-morales--sombrero', 'miles-morales', 'sombrero'),
  ('minnie-mouse--sombrero', 'minnie-mouse', 'sombrero'),
  ('miss-piggy--sombrero', 'miss-piggy', 'sombrero'),
  ('moana--sombrero', 'moana', 'sombrero'),
  ('modok--accesorio', 'modok', 'accesorio'),
  ('monstruo-galletas--sombrero', 'monstruo-galletas', 'sombrero'),
  ('moon-knight--sombrero', 'moon-knight', 'sombrero'),
  ('moon-knight--accesorio', 'moon-knight', 'accesorio'),
  ('mr-increible--sombrero', 'mr-increible', 'sombrero'),
  ('mujer-maravilla-clasica--sombrero', 'mujer-maravilla-clasica', 'sombrero'),
  ('mysterio--sombrero', 'mysterio', 'sombrero'),
  ('mysterio--accesorio', 'mysterio', 'accesorio'),
  ('ned-flanders--sombrero', 'ned-flanders', 'sombrero'),
  ('nova--sombrero', 'nova', 'sombrero'),
  ('odin--sombrero', 'odin', 'sombrero'),
  ('odin--accesorio', 'odin', 'accesorio'),
  ('omni-man--sombrero', 'omni-man', 'sombrero'),
  ('omni-man--accesorio', 'omni-man', 'accesorio'),
  ('pato-donald--sombrero', 'pato-donald', 'sombrero'),
  ('pato-lucas--sombrero', 'pato-lucas', 'sombrero'),
  ('pedro-picapiedra--sombrero', 'pedro-picapiedra', 'sombrero'),
  ('piolin--sombrero', 'piolin', 'sombrero'),
  ('polaris--accesorio', 'polaris', 'accesorio'),
  ('profesor-x--accesorio', 'profesor-x', 'accesorio'),
  ('pyro--accesorio', 'pyro', 'accesorio'),
  ('raven--sombrero', 'raven', 'sombrero'),
  ('raven--accesorio', 'raven', 'accesorio'),
  ('rescue--sombrero', 'rescue', 'sombrero'),
  ('robin--sombrero', 'robin', 'sombrero'),
  ('robin--accesorio', 'robin', 'accesorio'),
  ('robin-dimensions--sombrero', 'robin-dimensions', 'sombrero'),
  ('robin-dimensions--accesorio', 'robin-dimensions', 'accesorio'),
  ('robin-lego-batman--sombrero', 'robin-lego-batman', 'sombrero'),
  ('robin-lego-batman--accesorio', 'robin-lego-batman', 'accesorio'),
  ('ronan--sombrero', 'ronan', 'sombrero'),
  ('shaggy--sombrero', 'shaggy', 'sombrero'),
  ('sheldon-cooper--sombrero', 'sheldon-cooper', 'sombrero'),
  ('silvestre--sombrero', 'silvestre', 'sombrero'),
  ('soldado-del-invierno-minifig--sombrero', 'soldado-del-invierno-minifig', 'sombrero'),
  ('sonic--sombrero', 'sonic', 'sombrero'),
  ('speedy-gonzalez--sombrero', 'speedy-gonzalez', 'sombrero'),
  ('spider-gwen--sombrero', 'spider-gwen', 'sombrero'),
  ('spider-man-minifig--sombrero', 'spider-man-minifig', 'sombrero'),
  ('spider-man-simbionte--sombrero', 'spider-man-simbionte', 'sombrero'),
  ('stan-lee--sombrero', 'stan-lee', 'sombrero'),
  ('star-lord--sombrero', 'star-lord', 'sombrero'),
  ('starfire--sombrero', 'starfire', 'sombrero'),
  ('superior-spider-man--accesorio', 'superior-spider-man', 'accesorio'),
  ('superman-ojos-rojos--sombrero', 'superman-ojos-rojos', 'sombrero'),
  ('superman-ojos-rojos--accesorio', 'superman-ojos-rojos', 'accesorio'),
  ('taskmaster--sombrero', 'taskmaster', 'sombrero'),
  ('taskmaster--accesorio', 'taskmaster', 'accesorio'),
  ('taz--sombrero', 'taz', 'sombrero'),
  ('thor-minifig--sombrero', 'thor-minifig', 'sombrero'),
  ('thor-minifig--accesorio', 'thor-minifig', 'accesorio'),
  ('tormenta-minifig--sombrero', 'tormenta-minifig', 'sombrero'),
  ('tormenta-minifig--accesorio', 'tormenta-minifig', 'accesorio'),
  ('vampiro--sombrero', 'vampiro', 'sombrero'),
  ('vampiro--accesorio', 'vampiro', 'accesorio'),
  ('venom--accesorio', 'venom', 'accesorio'),
  ('vinicius-junior--sombrero', 'vinicius-junior', 'sombrero'),
  ('voldemort--sombrero', 'voldemort', 'sombrero'),
  ('voldemort--accesorio', 'voldemort', 'accesorio'),
  ('voldemort-dimensions--sombrero', 'voldemort-dimensions', 'sombrero'),
  ('voldemort-dimensions--accesorio', 'voldemort-dimensions', 'accesorio'),
  ('war-machine--sombrero', 'war-machine', 'sombrero'),
  ('war-machine--accesorio', 'war-machine', 'accesorio'),
  ('wolverine-mascara--sombrero', 'wolverine-mascara', 'sombrero');
-- fin generado

create function privado.precio_accesorio(p_rareza text) returns int
language sql immutable set search_path = '' as $$
  select case p_rareza when 'rara' then 90 when 'epica' then 130 when 'legendaria' then 180 end;
$$;

-- Estado: catálogo de personajes y de accesorios con precio, y lo que tiene el jugador.
create or replace function public.estado_personajes_tienda() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is not null and public.puedo_ver_personajes() then
    jsonb_build_object(
      'catalogo', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'saga', c.saga, 'rareza', c.rareza, 'precio', privado.precio_personaje(c.rareza, c.bigfig)) order by c.id)
        from privado.catalogo_tienda_personajes c where c.activo), '[]'::jsonb),
      'personajes', coalesce((select jsonb_agg(c.personaje order by c.personaje)
        from privado.personajes_comprados c where c.jugador = auth.uid()), '[]'::jsonb),
      'accesorios', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'donante', a.donante, 'parte', a.parte, 'rareza', c.rareza, 'precio', privado.precio_accesorio(c.rareza)) order by a.id)
        from privado.accesorios_tienda a join privado.catalogo_tienda_personajes c on c.id = a.donante
        where a.activo and c.activo), '[]'::jsonb),
      'mis_accesorios', coalesce((select jsonb_agg(j.pieza order by j.pieza)
        from privado.accesorios_jugador j where j.jugador = auth.uid()), '[]'::jsonb))
    else null end;
$$;

create table privado.pedidos_accesorios (
  jugador uuid not null references public.perfiles(id) on delete cascade,
  pedido  uuid not null,
  pieza   text not null,
  precio  int not null,
  primary key (jugador, pedido)
);
revoke all on privado.pedidos_accesorios from public, anon, authenticated;
alter table privado.pedidos_accesorios enable row level security;

create function public.comprar_accesorio(p_pieza text, p_precio int, p_pedido uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_precio int;
  v_previo privado.pedidos_accesorios;
begin
  if v_uid is null or not coalesce(public.puedo_ver_personajes(), false) then raise exception 'sin acceso'; end if;
  if p_pedido is null or p_pieza is null or p_precio is null or p_precio <= 0 then raise exception 'pedido inválido'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));
  select * into v_previo from privado.pedidos_accesorios where jugador = v_uid and pedido = p_pedido;
  if found then
    if (v_previo.pieza, v_previo.precio) is distinct from (p_pieza, p_precio) then raise exception 'pedido inválido'; end if;
  else
    select privado.precio_accesorio(c.rareza) into v_precio
    from privado.accesorios_tienda a join privado.catalogo_tienda_personajes c on c.id = a.donante
    where a.id = p_pieza and a.activo and c.activo
      and not exists (select 1 from privado.accesorios_jugador j where j.jugador = v_uid and j.pieza = a.id)
      and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = a.donante);
    if v_precio is null then raise exception 'ya no quedan cartas disponibles'; end if;
    if v_precio <> p_precio then raise exception 'el precio cambió'; end if;
    if privado.monedas_de(v_uid) < v_precio then raise exception 'saldo insuficiente'; end if;
    insert into public.movimientos_monedas (jugador, cantidad, motivo) values (v_uid, -v_precio, 'accesorio:' || left(p_pieza, 48));
    insert into privado.accesorios_jugador (jugador, pieza, origen) values (v_uid, p_pieza, 'compra');
    insert into privado.pedidos_accesorios (jugador, pedido, pieza, precio) values (v_uid, p_pedido, p_pieza, v_precio);
  end if;
  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'pieza', p_pieza);
end $$;

-- 3) Comodines: compra directa aunque no se haya descubierto (antes: solo reponer con 0 copias).
create or replace function public.reponer_comodin(p_comodin text, p_pedido uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_precio int;
  v_cantidad int;
  v_anterior text;
begin
  if v_uid is null or p_pedido is null then raise exception 'pedido inválido'; end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));
  select r.comodin into v_anterior from privado.reposiciones_comodines r where r.jugador = v_uid and r.pedido = p_pedido;
  if found then
    if v_anterior is distinct from p_comodin then raise exception 'pedido inválido'; end if;
  else
    select c.precio_reposicion into v_precio from public.comodines_tienda c where c.id = p_comodin and c.activo;
    if v_precio is null then raise exception 'carta no disponible'; end if;
    select c.cantidad into v_cantidad from public.comodines_jugador c
      where c.jugador = v_uid and c.comodin = p_comodin for update;
    if coalesce(v_cantidad, 0) >= 9 then raise exception 'tope de copias'; end if;
    if privado.monedas_de(v_uid) < v_precio then raise exception 'saldo insuficiente'; end if;
    insert into public.movimientos_monedas(jugador, cantidad, motivo) values (v_uid, -v_precio, 'reposicion:' || p_comodin);
    insert into public.comodines_jugador (jugador, comodin, cantidad) values (v_uid, p_comodin, 1)
      on conflict (jugador, comodin) do update set cantidad = public.comodines_jugador.cantidad + 1;
    insert into privado.reposiciones_comodines(jugador, pedido, comodin) values (v_uid, p_pedido, p_comodin);
  end if;
  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cantidad',
    (select c.cantidad from public.comodines_jugador c where c.jugador = v_uid and c.comodin = p_comodin));
end $$;

-- 4) Sobres nuevos
create table privado.sobres_alv (
  id      text primary key check (id ~ '^[a-z-]+$'),
  precio  int not null check (precio > 0),
  ranuras text[] not null check (cardinality(ranuras) between 1 and 3
            and ranuras <@ array['personaje', 'accesorio', 'comodin', 'cualquiera']),
  pesos   jsonb not null,
  minimo  text check (minimo in ('epica', 'legendaria')),
  activo  boolean not null default true
);
revoke all on privado.sobres_alv from public, anon, authenticated;
alter table privado.sobres_alv enable row level security;
-- generado: sobres
insert into privado.sobres_alv (id, precio, ranuras, pesos, minimo) values
  ('basico', 60, array['cualquiera'], '{"rara": 80, "epica": 17, "legendaria": 3}', null),
  ('accesorios', 120, array['accesorio', 'accesorio'], '{"rara": 75, "epica": 20, "legendaria": 5}', null),
  ('comodines', 150, array['comodin', 'comodin', 'comodin'], '{"rara": 100, "epica": 0, "legendaria": 0}', null),
  ('personajes', 180, array['personaje', 'personaje'], '{"rara": 75, "epica": 20, "legendaria": 5}', null),
  ('mixto', 200, array['personaje', 'accesorio', 'comodin'], '{"rara": 70, "epica": 24, "legendaria": 6}', null),
  ('epico', 380, array['personaje', 'personaje', 'personaje'], '{"rara": 50, "epica": 38, "legendaria": 12}', 'epica');
-- fin generado

create table privado.pedidos_sobres_alv (
  jugador uuid not null references public.perfiles(id) on delete cascade,
  pedido  uuid not null,
  sobre   text not null,
  precio  int not null,
  cartas  jsonb not null,
  primary key (jugador, pedido)
);
revoke all on privado.pedidos_sobres_alv from public, anon, authenticated;
alter table privado.pedidos_sobres_alv enable row level security;

create function public.abrir_sobre_alv(p_sobre text, p_precio int, p_pedido uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_s privado.sobres_alv;
  v_previo privado.pedidos_sobres_alv;
  v_cartas jsonb := '[]'::jsonb;
  v_tomados text[] := '{}';
  v_tipo text;
  v_rar text;
  v_id text;
  v_cant int;
  v_tiro float8;
  v_total float8;
  v_mejor int := 0;
  v_k int := 0;
  v_rango text[] := array['rara', 'epica', 'legendaria'];
begin
  if v_uid is null or not coalesce(public.puedo_ver_personajes(), false) then raise exception 'sin acceso'; end if;
  if p_pedido is null or p_sobre is null or p_precio is null then raise exception 'pedido inválido'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('monedas:' || v_uid::text));
  select * into v_previo from privado.pedidos_sobres_alv where jugador = v_uid and pedido = p_pedido;
  if found then
    if (v_previo.sobre, v_previo.precio) is distinct from (p_sobre, p_precio) then raise exception 'pedido inválido'; end if;
    return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cartas', v_previo.cartas, 'repetido', true);
  end if;
  select * into v_s from privado.sobres_alv where id = p_sobre and activo;
  if not found then raise exception 'sobre no disponible'; end if;
  if v_s.precio <> p_precio then raise exception 'el precio cambió'; end if;
  if privado.monedas_de(v_uid) < v_s.precio then raise exception 'saldo insuficiente'; end if;
  insert into public.movimientos_monedas (jugador, cantidad, motivo) values (v_uid, -v_s.precio, 'sobre-alv:' || v_s.id);

  foreach v_tipo in array v_s.ranuras loop
    v_k := v_k + 1;
    if v_tipo = 'cualquiera' then
      v_tiro := random();
      v_tipo := case when v_tiro < 0.4 then 'personaje' when v_tiro < 0.75 then 'accesorio' else 'comodin' end;
    end if;
    -- Rareza buscada según los pesos del sobre; la última carta asegura el mínimo si no ha salido.
    v_total := coalesce((v_s.pesos->>'rara')::float8, 0) + coalesce((v_s.pesos->>'epica')::float8, 0) + coalesce((v_s.pesos->>'legendaria')::float8, 0);
    v_tiro := random() * v_total;
    v_rar := case when v_tiro < coalesce((v_s.pesos->>'rara')::float8, 0) then 'rara'
      when v_tiro < coalesce((v_s.pesos->>'rara')::float8, 0) + coalesce((v_s.pesos->>'epica')::float8, 0) then 'epica' else 'legendaria' end;
    if v_s.minimo is not null and v_k = cardinality(v_s.ranuras)
      and v_mejor < array_position(v_rango, v_s.minimo) and array_position(v_rango, v_rar) < array_position(v_rango, v_s.minimo) then
      v_rar := v_s.minimo;
    end if;
    v_id := null;
    if v_tipo = 'personaje' then
      select c.id, c.rareza into v_id, v_rar from privado.catalogo_tienda_personajes c
      where c.activo and not (c.id = any (v_tomados))
        and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = c.id)
      order by (c.rareza = v_rar) desc, abs(array_position(v_rango, c.rareza) - array_position(v_rango, v_rar)), random() limit 1;
      if v_id is null then v_tipo := 'accesorio'; else
        insert into privado.personajes_comprados (jugador, personaje, origen) values (v_uid, v_id, 'compra')
          on conflict (jugador, personaje) do nothing;
        v_cartas := v_cartas || jsonb_build_array(jsonb_build_object('tipo', 'personaje', 'id', v_id, 'rareza', v_rar));
      end if;
    end if;
    if v_tipo = 'accesorio' and v_id is null then
      select a.id, c.rareza into v_id, v_rar from privado.accesorios_tienda a join privado.catalogo_tienda_personajes c on c.id = a.donante
      where a.activo and c.activo and not (a.id = any (v_tomados)) and not (a.donante = any (v_tomados))
        and not exists (select 1 from privado.accesorios_jugador j where j.jugador = v_uid and j.pieza = a.id)
        and not exists (select 1 from privado.personajes_comprados p where p.jugador = v_uid and p.personaje = a.donante)
      order by (c.rareza = v_rar) desc, abs(array_position(v_rango, c.rareza) - array_position(v_rango, v_rar)), random() limit 1;
      if v_id is null then v_tipo := 'comodin'; else
        insert into privado.accesorios_jugador (jugador, pieza, origen) values (v_uid, v_id, 'sobre') on conflict (jugador, pieza) do nothing;
        v_cartas := v_cartas || jsonb_build_array(jsonb_build_object('tipo', 'accesorio', 'id', v_id, 'rareza', v_rar));
      end if;
    end if;
    if v_tipo = 'comodin' and v_id is null then
      v_rar := 'rara';
      select c.id into v_id from public.comodines_tienda c where c.activo order by random() limit 1;
      select coalesce((select j.cantidad from public.comodines_jugador j where j.jugador = v_uid and j.comodin = v_id), 0) into v_cant;
      if v_cant >= 9 then
        insert into public.movimientos_monedas (jugador, cantidad, motivo) values (v_uid, 10, 'sobre:comodines-llenos');
        v_cartas := v_cartas || jsonb_build_array(jsonb_build_object('tipo', 'monedas', 'cantidad', 10, 'comodin', v_id));
      else
        insert into public.comodines_jugador (jugador, comodin, cantidad) values (v_uid, v_id, 1)
          on conflict (jugador, comodin) do update set cantidad = public.comodines_jugador.cantidad + 1;
        v_cartas := v_cartas || jsonb_build_array(jsonb_build_object('tipo', 'comodin', 'id', v_id,
          'especial', (select c.especial from public.comodines_tienda c where c.id = v_id)));
      end if;
    end if;
    v_tomados := v_tomados || v_id;
    v_mejor := greatest(v_mejor, coalesce(array_position(v_rango, v_rar), 1));
  end loop;

  insert into privado.pedidos_sobres_alv (jugador, pedido, sobre, precio, cartas) values (v_uid, p_pedido, v_s.id, v_s.precio, v_cartas);
  return jsonb_build_object('monedas', privado.monedas_de(v_uid), 'cartas', v_cartas);
end $$;

-- 5) Administradores: saldo ilimitado para probar (sus compras se anotan igual).
create or replace function privado.monedas_de(p_jugador uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from privado.administradores a where a.jugador = p_jugador) then 999999
    else (select coalesce(sum(m.cantidad), 0)::int from public.movimientos_monedas m where m.jugador = p_jugador) end;
$$;

revoke all on function privado.precio_accesorio(text), public.comprar_accesorio(text, int, uuid),
  public.abrir_sobre_alv(text, int, uuid) from public, anon, authenticated;
grant execute on function public.comprar_accesorio(text, int, uuid), public.abrir_sobre_alv(text, int, uuid) to authenticated;
revoke all on function public.estado_personajes_tienda(), public.reponer_comodin(text, uuid) from public, anon;
grant execute on function public.estado_personajes_tienda(), public.reponer_comodin(text, uuid) to authenticated;
