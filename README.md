# Pokemon Battle Rooms

Pokemon Battle Rooms es un videojuego web full-stack de batallas Pokemon por salas. Permite jugar 1 vs 1 en tiempo real por codigo de sala o practicar en modo solitario contra un bot. El backend es la fuente de verdad: calcula turnos, dano, tipos, estados, cambios, victoria, abandono y persistencia. El frontend se enfoca en una experiencia arcade oscura, visual y animada.

## Caracteristicas Principales

- Salas multijugador 1P vs 1P con codigo unico.
- Modo solitario contra `Professor Bot`.
- Login obligatorio con Google OAuth.
- Pase Premium con Stripe Checkout.
- Motor de batalla server-authoritative.
- Importacion de Pokemon, movimientos y tipos desde PokeAPI.
- MongoDB para usuarios, salas, batallas, Pokemon, movimientos y relaciones de tipo.
- Equipos de hasta 6 Pokemon.
- 4 movimientos por Pokemon en batalla.
- Efectividad de tipos importada desde PokeAPI, no hardcodeada.
- Estados temporales: quemadura, veneno, paralisis y cambios de stats.
- Orden de turno por cambio, prioridad, velocidad y desempate.
- Logs persistentes de batalla.
- Abandono de partida con derrota automatica y penalizacion.
- UI arcade oscura con animaciones de seleccion, ataques, impactos, vida y estado.
- Docker Compose para levantar MongoDB, backend y frontend.

## Stack

- Frontend: React 19, TypeScript, Vite, TanStack Router, TanStack Query, Framer Motion, Lucide Icons.
- Backend: Bun, Hono, TypeScript.
- Base de datos: MongoDB 7.
- Auth: Google OAuth 2.0 con JWT interno.
- Pagos: Stripe Checkout y webhook.
- Infra local: Docker Compose.

## Estructura

```txt
.
├── apps
│   ├── backend
│   │   ├── src/db
│   │   ├── src/engine
│   │   ├── src/repositories
│   │   ├── src/routes
│   │   ├── src/scripts
│   │   ├── src/services
│   │   └── src/types
│   └── frontend
│       ├── src/components
│       ├── src/hooks
│       ├── src/routes
│       ├── src/services
│       └── src/types
├── docker-compose.yml
├── package.json
└── README.md
```

## Configuracion De Entorno

Copia `.env.example` a `.env`:

```powershell
Copy-Item .env.example .env
```

Variables principales:

```env
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=tu_client_id_de_google
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
JWT_SECRET=una_clave_larga_local

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_AMOUNT=499
STRIPE_PREMIUM_CURRENCY=usd
STRIPE_SUCCESS_URL=http://localhost:3000/premium/success
STRIPE_CANCEL_URL=http://localhost:3000/premium/cancel
```

Importante: `.env` no debe subirse al repositorio. Este proyecto ya lo ignora con `.gitignore`.

## Google OAuth

En Google Cloud Console crea un OAuth Client tipo Web Application y registra este redirect URI:

```txt
http://localhost:3001/api/auth/google/callback
```

Flujo implementado:

1. El frontend envia al usuario a `/api/auth/google`.
2. Google autentica y redirige a `/api/auth/google/callback`.
3. El backend intercambia el `code` por tokens de Google.
4. El backend lee el perfil real del usuario.
5. El usuario se guarda/actualiza en MongoDB.
6. El backend emite un JWT propio para la app.
7. Crear sala, unirse y jugar requieren sesion Google.

## Stripe Checkout

El proyecto incluye un Pase Premium de prueba llamado `Trainer Premium Pass`.

Flujo implementado:

1. El usuario inicia sesion con Google.
2. Entra a `/premium`.
3. El frontend pide al backend crear una Stripe Checkout Session.
4. El backend crea la sesion con `STRIPE_SECRET_KEY`.
5. Stripe procesa el pago.
6. Stripe redirige a `/premium/success` o `/premium/cancel`.
7. El webhook `/api/payments/webhook` marca el usuario como premium en MongoDB.

Para escuchar webhooks en local:

```powershell
stripe listen --forward-to localhost:3001/api/payments/webhook
```

La CLI devolvera un valor `whsec_...`; ponlo en:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Tarjeta de prueba:

```txt
4242 4242 4242 4242
```

Fecha futura y cualquier CVC.

## Instalacion

```powershell
bun install
```

## Levantar Con Docker

```powershell
docker compose up --build -d
```

Servicios:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- MongoDB: `localhost:27017`

Ver estado:

```powershell
docker compose ps
```

## Importar Pokemon

Despues de levantar los contenedores:

```powershell
docker compose exec backend bun src/scripts/import-pokemon.ts 300
```

Tambien existe endpoint:

```txt
POST http://localhost:3001/api/import/pokemon
```

## Scripts

```powershell
bun run dev
bun run dev:backend
bun run dev:frontend
bun run import:pokemon
bun run typecheck
bun run build
```

## Flujo De Juego

### Modo Solitario

1. Abrir `http://localhost:3000`.
2. Entrar a `Modo solitario`.
3. Iniciar sesion con Google.
4. El backend crea una sala activa.
5. El jugador recibe 6 Pokemon aleatorios.
6. `Professor Bot` recibe 6 Pokemon aleatorios.
7. El jugador elige movimientos o cambios.
8. El bot responde automaticamente.

### Multijugador

1. Jugador 1 entra con Google.
2. Crea sala y comparte el codigo.
3. Jugador 2 entra con Google.
4. Jugador 2 se une con el codigo.
5. Ambos seleccionan hasta 6 Pokemon.
6. Ambos guardan equipo.
7. La batalla inicia cuando ambos estan listos.
8. Cada turno se resuelve en backend.

## Motor De Batalla

El motor vive en `apps/backend/src/engine`.

Responsabilidades:

- Validar acciones.
- Determinar orden de turno.
- Calcular dano.
- Aplicar STAB.
- Aplicar efectividad por tipo.
- Aplicar criticos y variacion aleatoria.
- Aplicar quemadura, veneno y paralisis.
- Aplicar cambios de stats.
- Resolver debilitamiento.
- Resolver victoria.
- Limpiar acciones al final del turno.

Formula base:

```txt
baseDamage = floor(floor(floor((2 * level) / 5 + 2) * power * attack / defense) / 50) + 2
finalDamage = floor(baseDamage * modifier)
```

`modifier` incluye:

- STAB.
- Efectividad por tipo.
- Critico.
- Variacion aleatoria.
- Penalizacion por quemadura en ataques fisicos.

## Estados

- `burn`: dano por turno y reduce dano fisico.
- `poison`: dano por turno.
- `paralysis`: reduce velocidad y puede impedir movimiento.
- `attackDown`, `defenseDown`, `speedDown`: cambios temporales de stats.

Los estados temporales duran 3 turnos.

## Abandono Y Penalizacion

La batalla incluye ruta de abandono:

```txt
POST /api/battles/:code/forfeit
```

Si un jugador abandona:

- Su equipo queda debilitado.
- La batalla pasa a `finished`.
- El rival gana.
- Se registra penalizacion de tipo `forfeit`.
- Se agregan logs explicando el abandono.

## Endpoints Principales

```txt
GET  /health

GET  /api/auth/google
GET  /api/auth/google/callback
GET  /api/auth/me

POST /api/import/pokemon
GET  /api/pokemon

POST /api/rooms
POST /api/rooms/solo
POST /api/rooms/:code/join
GET  /api/rooms/:code
POST /api/rooms/:code/team
POST /api/rooms/:code/start

GET  /api/battles/:code
POST /api/battles/:code/action
POST /api/battles/:code/forfeit

POST /api/payments/checkout
POST /api/payments/status
POST /api/payments/webhook
```

## Diseno UI

La interfaz usa una direccion visual oscura tipo arcade:

- Fondos con grilla.
- Paneles con bordes neon.
- Sprites oficiales de PokeAPI.
- Campo de batalla con posiciones claras de jugador/rival.
- Barra de vida animada.
- Toasts compactos de eventos.
- Animaciones de ataques por tipo.
- Tarjetas de seleccion con entrada escalonada, hover, scanline, brillo y check animado.
- Dashboard de batalla compacto con movimientos, equipo y log.

## Seguridad

- No se sube `.env`.
- Las claves secretas viven solo en backend.
- Stripe secret key nunca aparece en frontend.
- Google OAuth valida identidad real.
- El backend no confia en correos escritos manualmente.
- El frontend no calcula batalla ni pagos.

## Limitaciones Conocidas

- El multijugador usa polling simple, no WebSockets.
- El bot tiene IA basica.
- No se implementan todas las reglas competitivas oficiales.
- No hay PP por movimiento.
- Stripe esta en modo test.
- Webhook requiere Stripe CLI o URL publica para funcionar localmente.

## Comandos Utiles

```powershell
docker compose up --build -d
docker compose ps
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
docker compose exec backend bun src/scripts/import-pokemon.ts 300
bun run typecheck
bun run build
```

## Autor

Proyecto desarrollado para UTP/FISC como demo full-stack de juego web con arquitectura backend-authoritative, persistencia real, autenticacion OAuth y pagos de prueba.
