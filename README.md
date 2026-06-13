# Damas A*

Aplicacion web individual de **Damas inglesas 8x8 contra la computadora**.  
La decision de la IA se calcula en un **microservicio independiente en Bun** usando **A\*** y nada mas.

## Que cumple del proyecto

- Juego de damas funcional.
- Validacion de movimientos en backend.
- Captura obligatoria.
- Capturas multiples.
- Coronacion.
- Fin de partida.
- Login y registro con contrasenas cifradas.
- Ranking persistido en MongoDB.
- Pago en linea en modo prueba con Stripe.
- Microservicio separado para IA con **A\***.
- Docker Compose para levantar todo.
- Tests del microservicio A*.

## Variante elegida

Se implementa **Damas inglesas / americanas 8x8**:

- tablero de 8x8
- juego en casillas oscuras
- rojas empiezan
- fichas normales avanzan en diagonal
- reyes en ambos sentidos
- captura obligatoria
- captura multiple con la misma ficha
- coronacion al llegar a la ultima fila

## Arquitectura

```text
Frontend (TanStack Router)
        |
        v
Backend principal (Hono + Bun)
        |
        +--> MongoDB
        |
        +--> Microservicio IA A* (Bun)
```

## Servicios y puertos

| Servicio | Puerto | Funcion |
|---|---:|---|
| Frontend | 3000 | Interfaz del juego |
| Backend | 3001 | Auth, reglas, partidas, ranking, pagos |
| AI A* Service | 3004 | Calcula la jugada de la computadora |
| MongoDB | 27017 | Persistencia |
| Prometheus | 9090 | Metricas |
| Grafana | 3003 | Visualizacion de metricas |

## Stack

- Bun
- Hono
- MongoDB
- Docker / Docker Compose
- React
- TanStack Router
- Stripe test mode

## Como funciona el microservicio A*

Este es el punto mas importante del proyecto.

La IA **no vive en el frontend** ni directamente en el backend principal.  
La IA vive en:

```text
apps/ai-astar-service
```

El backend principal le manda por HTTP el estado actual del tablero y el microservicio responde con la jugada elegida.

### Flujo completo

1. El jugador humano hace un movimiento en el frontend.
2. El frontend envia ese movimiento al backend.
3. El backend valida si el movimiento es legal.
4. Si luego toca la computadora, el backend llama al microservicio A*.
5. El microservicio recibe el tablero actual en JSON.
6. El microservicio calcula la mejor jugada usando **A\***.
7. El microservicio responde la jugada.
8. El backend aplica esa jugada al estado de la partida.
9. El frontend vuelve a consultar el estado y lo pinta en pantalla.

### Endpoint principal

```http
POST /move
```

URL local:

```text
http://localhost:3004/move
```

### Request que recibe

```json
{
  "difficulty": "medium",
  "board": [
    {
      "id": "red-5-0",
      "color": "red",
      "kind": "man",
      "row": 5,
      "col": 0
    }
  ],
  "currentPlayer": "black",
  "forcedPieceId": null
}
```

### Response que devuelve

```json
{
  "from": { "row": 2, "col": 1 },
  "to": { "row": 3, "col": 2 },
  "evaluationScore": 123,
  "algorithm": "astar",
  "pathLength": 4,
  "nodesExplored": 31,
  "pathsEvaluated": 6,
  "goalCount": 6,
  "computeTimeMs": 2,
  "goal": { "row": 7, "col": 0 }
}
```

### Que hace internamente

El microservicio:

- toma las jugadas legales del turno actual
- evalua cada jugada posible
- para cada candidata usa **A\*** como busqueda de ruta sobre metas del tablero
- compara costos
- devuelve la mejor opcion

No usa:

- Minimax
- Alpha-Beta
- Monte Carlo
- algoritmo mixto

Solo usa **A\*** para la decision de la jugada de la computadora.

### Archivos clave del microservicio

- `apps/ai-astar-service/src/index.ts`
- `apps/ai-astar-service/src/engine.ts`
- `apps/ai-astar-service/src/pathfinding.ts`
- `apps/ai-astar-service/src/types.ts`
- `apps/ai-astar-service/src/engine.test.ts`

### Donde lo invoca el backend

El backend lo consume desde:

```text
apps/backend/src/services/ai-client.ts
```

La logica de reglas del juego y la aplicacion del movimiento estan en:

```text
apps/backend/src/services/checkers.service.ts
```

## Instalacion con Docker

### 1. Clonar el repositorio

```powershell
git clone <URL_DEL_REPO>
cd damas
```

### 2. Crear el archivo de entorno

```powershell
Copy-Item .env.example .env
```

### 3. Levantar los servicios

```powershell
docker compose up --build
```

### 4. Abrir la aplicacion

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:3001/health](http://localhost:3001/health)
- IA A* health: [http://localhost:3004/health](http://localhost:3004/health)
- Grafana: [http://localhost:3003](http://localhost:3003)

## Instalacion local sin Docker

### Requisitos

- Bun
- MongoDB corriendo en local

### Pasos

```powershell
bun install
Copy-Item .env.example .env
bun run dev:ai-astar
bun run dev:backend
bun run dev:frontend
```

## Variables de entorno

Archivo base:

```env
FRONTEND_URL=http://localhost:3000
PORT=3001
MONGO_URI=mongodb://localhost:27017/damas
CORS_ORIGIN=*
JWT_SECRET=cambia-esto-por-una-clave-larga-local
AI_ASTAR_SERVICE_URL=http://localhost:3004
VITE_API_URL=http://localhost:3001
STRIPE_SECRET_KEY=sk_test_coloca_tu_clave
STRIPE_WEBHOOK_SECRET=whsec_coloca_tu_secreto
STRIPE_PREMIUM_AMOUNT=499
STRIPE_PREMIUM_CURRENCY=usd
```

## Como usar la app

### Flujo basico

1. Registrar usuario o entrar como invitado.
2. Crear partida.
3. Elegir dificultad.
4. Agregar computadora si hace falta.
5. Iniciar partida.
6. Jugar contra la IA.
7. Al terminar, revisar ranking.

### Flujo de demostracion para la rubrica

1. Iniciar sesion.
2. Crear partida.
3. Empezar partida desde el lobby.
4. Hacer varios movimientos.
5. Mostrar que el backend valida el juego.
6. Mostrar llamada al microservicio A*.
7. Mostrar una captura multiple.
8. Mostrar coronacion.
9. Terminar partida y revisar ranking.
10. Ir a `/premium` y hacer compra de prueba.
11. Ejecutar tests.

## Tests

```powershell
bun run test
bun run typecheck
bun run build
```

Actualmente los tests cubren principalmente el microservicio A*:

- busqueda de ruta
- caso sin ruta
- captura obligatoria
- continuidad de captura multiple con `forcedPieceId`

## Estructura del proyecto

```text
apps/
  ai-astar-service/
  backend/
  frontend/
infra/
docker-compose.yml
README.md
```

## Limitaciones conocidas

- A* no es el algoritmo ideal para damas, pero aqui se usa por requisito academico.
- El frontend solo representa el estado; la validacion real ocurre en backend.
- La dificultad cambia la forma de evaluacion del A*, no cambia de algoritmo.

## Estado actual

El proyecto ya compila y fue validado con:

```powershell
bun run typecheck
bun run test
bun run build
```
