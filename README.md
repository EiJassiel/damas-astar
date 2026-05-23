# Pokemon Battle Rooms

Aplicacion web de batallas Pokemon **1P vs 1P** por salas con codigo. Los datos provienen de **PokeAPI**, se persisten en **MongoDB** y el combate lo resuelve el **backend** (frontend solo envia decisiones y muestra estado).

**Repositorio:** https://github.com/EiJassiel/game-poke.git

---

## Stack

| Capa | Tecnologia |
|------|------------|
| Frontend | React 19, TypeScript, Vite, **TanStack Router**, TanStack Query, Framer Motion |
| Backend | **Bun**, **Hono**, TypeScript |
| Base de datos | **MongoDB** 7 |
| Infra | **Docker Compose** |
| Auth (extra) | Google OAuth + JWT |
| Pagos (extra) | Stripe Checkout (modo test) |

> **Nota sobre TanStack Start:** el enunciado pide TanStack Start. Este proyecto usa **TanStack Router** (ecosistema TanStack) con Vite como bundler. El routing, data fetching y SSR-ready patterns estan cubiertos por Router + Query; la diferencia principal es que no hay servidor SSR de TanStack Start.

---

## Requisitos del enunciado — como se cumplen

### Datos Pokemon y persistencia (20 pts)

| Requisito | Implementacion |
|-----------|----------------|
| Cargar ≥ 300 Pokemon desde PokeAPI | Script `apps/backend/src/scripts/import-pokemon.ts` (default 300). Tambien `POST /api/import/pokemon`. |
| Persistir Pokemon, movimientos, tipos, stats, sprites | Colecciones MongoDB via `import.service.ts` → `pokemon`, `moves`, `types`. |
| Relaciones de dano entre tipos desde PokeAPI | `importTypes()` lee `/type/{name}` y guarda `doubleDamageTo`, `halfDamageTo`, `noDamageTo`, etc. Motor en `engine/type-effectiveness.ts`. |
| 4 movimientos validos por Pokemon | `chooseStoredMoves()` selecciona movimientos importados; en batalla `buildBattlePokemon()` expone exactamente 4. |

### Salas, jugadores y flujo (20 pts)

| Requisito | Implementacion |
|-----------|----------------|
| Crear sala con codigo | `POST /api/rooms` → codigo de 6 letras (`createBattleRoom`). |
| Segundo jugador se une por codigo | `POST /api/rooms/:code/join`. |
| Lobby | Ruta `/lobby/$code` con lista de jugadores y copiar codigo. |
| Seleccion de equipo (hasta 6) | Ruta `/team/$code` + `POST /api/rooms/:code/team`. |
| 1P vs 1P, un activo por jugador | `BattleDocument` con 2 jugadores, `activeIndex` por equipo. |
| Backend valida acciones | `engine/validators.ts`: turno activo, movimiento permitido, sin doble accion. |
| Frontend no calcula dano | `BattleArena` solo llama `POST /api/battles/:code/action`; dano en backend. |

### Motor de turnos, dano, tipos y estados (25 pts)

| Requisito | Implementacion |
|-----------|----------------|
| Resolucion de turnos en backend | `engine/battle-engine.ts` → `resolveTurn()`. |
| STAB, efectividad, factor aleatorio, critico | `engine/damage.ts`. |
| Efectividad no hardcodeada | Multiplicador desde documentos `types` importados de PokeAPI. |
| Estados 3 turnos | `engine/status.ts` → `remainingTurns: 3`. |
| Estado se elimina al cambiar Pokemon | En switch: `active.status = null` (`battle-engine.ts` linea 33). |
| Orden de turno | `engine/turn-order.ts` (cambio, prioridad, velocidad). |
| Victoria / derrota | `hasLost()` + banner en frontend; abandono via `POST .../forfeit`. |

### Interfaz, sprites y animaciones (15 pts)

| Requisito | Implementacion |
|-----------|----------------|
| Crear / unirse / lobby / batalla | Rutas `/`, `/create-room`, `/join-room`, `/lobby/$code`, `/battle/$code`. |
| Sprites consistentes | URLs de PokeAPI guardadas en MongoDB y usadas en catalogo y arena. |
| Barras de vida | `HealthBar`, barras en sidebar y HUD. |
| Movimientos y cambio | Grid de movimientos + sidebar de equipo. |
| Log de batalla | `BattleLog` con entradas del backend. |
| Animaciones basicas | Framer Motion: impactos, shake del campo, numeros de dano, transiciones de sprites, barras animadas, VFX por tipo. |

### Documentacion, Docker y demo (20 pts)

| Entregable | Ubicacion |
|------------|-----------|
| Codigo completo | Este repositorio |
| README | Este archivo |
| docker-compose.yml | Raiz del proyecto |
| Importacion documentada | Seccion [Importar Pokemon](#importar-pokemon) |
| Demo 1P vs 1P | Seccion [Guia de demo en clase](#guia-de-demo-en-clase) |

---

## Inicio rapido

### 1. Clonar y configurar entorno

```powershell
git clone https://github.com/EiJassiel/game-poke.git
cd game-poke
Copy-Item .env.example .env
```

Edita `.env` con tus credenciales de Google OAuth. **No subas `.env` al repo.**

### 2. Levantar con Docker

```powershell
docker compose up --build -d
docker compose ps
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| MongoDB | localhost:27017 |

### 3. Importar Pokemon

Primera vez (requiere contenedores arriba):

```powershell
docker compose exec backend bun src/scripts/import-pokemon.ts 300
```

Alternativa via API:

```powershell
Invoke-WebRequest -Method POST -Uri http://localhost:3001/api/import/pokemon -ContentType "application/json" -Body '{"limit":300}'
```

---

## Google OAuth

1. Crea un OAuth Client (Web) en [Google Cloud Console](https://console.cloud.google.com/).
2. Redirect URI autorizado:

```txt
http://localhost:3001/api/auth/google/callback
```

3. Copia `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` a `.env`.
4. Crear sala y unirse requieren sesion Google.

---

## Guia de demo en clase

Flujo alineado con la demo esperada del enunciado:

1. **Levantar el proyecto** — `docker compose up --build -d` y verificar http://localhost:3000.
2. **Importar datos** — `docker compose exec backend bun src/scripts/import-pokemon.ts 300`.
3. **Jugador 1** — Iniciar sesion con Google → **Crear sala** → copiar codigo de 6 letras.
4. **Jugador 2** — Otra ventana/incognito → Google → **Unirse** con el codigo.
5. **Equipos** — Cada uno elige hasta 6 Pokemon y guarda. La batalla inicia sola cuando ambos estan listos.
6. **Sprites y 4 movimientos** — En arena, cada Pokemon activo muestra sprite y exactamente 4 movimientos.
7. **Turnos y dano por tipo** — Atacar con movimientos super efectivos; el log muestra *"It's super effective!"*.
8. **Estado 3 turnos** — Usar movimientos con quemadura/veneno/paralisis; el log indica duracion y tick de dano.
9. **Cambio elimina estado** — Cambiar Pokemon activo; el estado desaparece (backend limpia `status` en switch).
10. **Victoria/derrota** — Debilitar los 6 del rival o usar **Salir** (abandono = derrota).

---

## Estructura del proyecto

```txt
.
├── apps/
│   ├── backend/
│   │   ├── src/engine/          # Motor de batalla (dano, tipos, estados, turnos)
│   │   ├── src/repositories/    # Acceso MongoDB
│   │   ├── src/routes/          # API Hono
│   │   ├── src/scripts/         # import-pokemon.ts
│   │   └── src/services/        # Salas, batallas, importacion, auth
│   └── frontend/
│       ├── src/components/      # BattleArena, HealthBar, BattleLog, etc.
│       ├── src/routes/          # Pantallas (TanStack Router file-based)
│       └── src/hooks/           # Polling de sala y batalla
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Reglas de combate implementadas

### Formula de dano

```txt
baseDamage = floor(floor(floor((2 * level) / 5 + 2) * power * attack / defense) / 50) + 2
finalDamage = floor(baseDamage * modifier)
```

`modifier` incluye: STAB (1.5x), efectividad de tipos, critico (1.5x, ~1/24), variacion aleatoria (0.85–1.0), penalizacion por quemadura en ataques fisicos.

### Estados

| Estado | Efecto | Duracion |
|--------|--------|----------|
| burn | Dano por turno; -50% dano fisico | 3 turnos |
| poison | Dano por turno | 3 turnos |
| paralysis | Velocidad /2; 25% no moverse | 3 turnos |
| attackDown / defenseDown / speedDown | Cambios de stats | 3 turnos |

Al **cambiar de Pokemon**, el estado del activo anterior se elimina.

---

## API principal

```txt
GET  /health

GET  /api/auth/google
GET  /api/auth/google/callback
GET  /api/auth/me

POST /api/import/pokemon
GET  /api/pokemon

POST /api/rooms
POST /api/rooms/:code/join
GET  /api/rooms/:code
POST /api/rooms/:code/team
POST /api/rooms/:code/start

GET  /api/battles/:code
POST /api/battles/:code/action
POST /api/battles/:code/forfeit

POST /api/payments/checkout      # extra: Stripe
POST /api/payments/verify        # extra: activacion sin webhook
POST /api/payments/webhook
```

---

## Desarrollo local (sin Docker)

```powershell
bun install
# MongoDB corriendo en localhost:27017
Copy-Item .env.example .env
bun run dev:backend    # puerto 3001
bun run dev:frontend   # puerto 3000
bun run import:pokemon # importa 300 Pokemon
```

---

## Funcionalidades extra (fuera del enunciado base)

- **Google OAuth** — identidad real para multijugador.
- **Trainer Premium Pass** — Stripe Checkout con cosmeticos (marco, lobby, campo estadio).
- **Verificacion de pago** — `POST /api/payments/verify` como fallback local sin webhook.

---

## Limitaciones conocidas

- Multijugador usa **polling** (no WebSockets).
- Frontend con **TanStack Router + Vite**, no TanStack Start SSR.
- No hay PP por movimiento ni reglas VGC completas.
- Algunos Pokemon se omiten en importacion si no tienen 4 movimientos validos en PokeAPI.
- Stripe en modo test; webhook local requiere `stripe listen --forward-to localhost:3001/api/payments/webhook`.
- Google OAuth y Stripe son opcionales para probar motor de batalla, pero **crear/unir salas requiere Google**.

---

## Comandos utiles

```powershell
docker compose up --build -d
docker compose ps
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
docker compose exec backend bun src/scripts/import-pokemon.ts 300
bun run typecheck
bun run build
```

---

## Autor

**EiJassiel** — Proyecto individual UTP/FISC. Entrega: 22 de mayo de 2026.
