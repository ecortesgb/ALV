# ALV · Amigos, Locuras y Verdades

Plataforma de juegos de fiesta para 2 a 8 personas. Un motor y tres interfaces:

- **Anfitrión** (`#/anfitrion`): arma el evento y la partida y avanza rondas.
- **Jugador** (`#/jugador`): el celular de cada quien, con su personaje, XP y tienda.
- **Pantalla** (`#/pantalla`): la TV. Solo muestra lo público.

## Estructura

| Carpeta | Qué tiene |
| --- | --- |
| `src/engine` | El motor: partida como máquina de estados, mecánicas, filtros de seguridad, economía de XP y vistas públicas y privadas |
| `src/content` | Catálogo (escenarios, lugares, secciones, juegos, siglas, cartas de poder) y paquetes de cartas |
| `src/app` | La app en React |
| `public/lego` | Las 310 piezas del personaje |
| `tools` | Conversión del contenido viejo y revisión de la configuración antes del build |

## Comandos

```
npm install
npm run dev        # app en local
npm test           # pruebas del motor (A a F + seguridad)
npm run build      # revisa la llave, tipos y arma dist/
```

## Configuración

Copia `.env.example` como `.env.local` con la URL de Supabase y la llave **publicable**. Sin esos datos la app corre en modo local, en un solo dispositivo.

## Avance

Ver `docs/BITACORA.md`. La definición del producto está en `docs/DOCUMENTO_MAESTRO.md`.
