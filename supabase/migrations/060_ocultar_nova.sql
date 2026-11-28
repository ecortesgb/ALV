-- Nova sale sin cara (su modelo no trae la calcomanía). Elías, 28 nov: «ocultarla hasta arreglarla».
-- Se apaga en venta, sobres, premios de nivel y su accesorio. Quien ya la compró la conserva (personajes_comprados no se toca).
-- Para volver a mostrarla: update privado.catalogo_tienda_personajes set activo = true where id = 'nova';
update privado.catalogo_tienda_personajes set activo = false where id = 'nova';
