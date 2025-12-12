# Plugin Arc - Modular Plugin Architecture

A production-ready Node.js plugin-based modular system built with Express.js and TypeScript. Features dynamic plugin loading, lifecycle management, event-based inter-plugin communication, and Kafka messaging.

## Features

- **Plugin Architecture**: Independent, hot-swappable plugins with lifecycle hooks
- **Event-Driven**: Inter-plugin communication via typed event emitter
- **Kafka Messaging**: Async message queue for event-driven architecture
- **WebSocket Support**: Real-time communication via Socket.io with JWT authentication
- **OpenAPI Documentation**: Auto-generated Swagger docs from Zod schemas
- **Type-Safe**: Full TypeScript with strict mode
- **Production Ready**: Security headers, rate limiting, graceful shutdown
- **Scalable**: Redis-backed caching, PostgreSQL with Prisma, Kafka for messaging

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL
- Redis
- Kafka (optional)

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment file and configure
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# Start development server
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker

```bash
# Start PostgreSQL and Redis only
docker compose up -d

# Start with Kafka (optional)
docker compose --profile kafka up -d

# Build and run the app
docker build -t plugin-arc .
docker run -p 4000:4000 --env-file .env plugin-arc
```

## Project Structure

```
plugin-arc/
├── src/
│   ├── core/           # Core system (server, plugin loader, lifecycle)
│   ├── config/         # Configuration and environment validation
│   ├── common/         # Shared middleware, errors, responses
│   │   ├── middleware/ # Error handler, rate limiter, sanitize, etc.
│   │   ├── errors/     # Custom error classes
│   │   ├── responses/  # Standardized API responses
│   │   └── validators/ # Common Zod schemas
│   ├── shared/         # Infrastructure (db, cache, messaging, events)
│   │   ├── db/         # Prisma client
│   │   ├── cache/      # Redis client
│   │   ├── messaging/  # Kafka producer/consumer
│   │   ├── events/     # Typed event emitter
│   │   ├── openapi/    # OpenAPI/Swagger documentation
│   │   └── websocket/  # Socket.io server
│   └── plugins/        # Plugin modules
│       └── auth/       # Authentication plugin
├── prisma/             # Database schema and migrations
└── tests/              # Test files
```

## Environment Variables

```bash
# Server
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/plugin_arc"

# Redis
REDIS_URL="redis://localhost:6379"

# Kafka (optional)
KAFKA_ENABLED=false
KAFKA_BROKERS="localhost:9092"
KAFKA_CLIENT_ID="plugin-arc"

# JWT
JWT_SECRET="your-secret-key-at-least-32-characters"
JWT_EXPIRES_IN="7d"
JWT_COOKIE_NAME="token"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Request
REQUEST_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty

# WebSocket
WS_ENABLED=true
WS_CORS_ORIGIN="*"

# OpenAPI Documentation
OPENAPI_ENABLED=true
```

## API Documentation

### Swagger UI

Interactive API documentation is available at `/api/docs`. The OpenAPI spec is auto-generated from Zod schemas.

- **Swagger UI**: `http://localhost:4000/api/docs`
- **OpenAPI JSON**: `http://localhost:4000/api/docs.json`

Plugins can register their routes with OpenAPI metadata:

```typescript
import { openApiRegistry } from '../../shared/openapi';
import { z } from 'zod';

// Define schema with OpenAPI metadata
const MyRequestSchema = z
  .object({
    name: z.string().openapi({ description: 'User name', example: 'John' }),
  })
  .openapi('MyRequest', { description: 'Request body' });

// Register route
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/v1/my-plugin/action',
  tags: ['MyPlugin'],
  summary: 'Perform an action',
  request: {
    body: { content: { 'application/json': { schema: MyRequestSchema } } },
  },
  responses: { 200: { description: 'Success' } },
});
```

## API Endpoints

### Health Check

`GET /health` - Returns system health status

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-12T06:50:00.000Z",
  "uptime": 3600,
  "version": "v1",
  "environment": "development",
  "services": {
    "database": "connected",
    "redis": "connected",
    "kafka": "connected"
  }
}
```

| Status     | HTTP Code | Meaning                   |
| ---------- | --------- | ------------------------- |
| `ok`       | 200       | All services healthy      |
| `degraded` | 503       | One or more services down |
| `error`    | 500       | Health check failed       |

### Auth Plugin

| Endpoint                | Method | Description       | Auth Required |
| ----------------------- | ------ | ----------------- | ------------- |
| `/api/v1/auth/register` | POST   | User registration | No            |
| `/api/v1/auth/login`    | POST   | User login        | No            |
| `/api/v1/auth/me`       | GET    | Get current user  | Yes           |

## Creating a Plugin

1. Create a new folder in `src/plugins/your-plugin/`

2. Add `plugin.json`:

```json
{
  "name": "your-plugin",
  "version": "1.0.0",
  "description": "Your plugin description",
  "enabled": true
}
```

3. Create the plugin structure:

```
src/plugins/your-plugin/
├── index.ts        # Plugin definition + lifecycle hooks
├── plugin.json     # Metadata
├── constants.ts    # Plugin-specific constants
├── routes.ts       # Route definitions
├── controller.ts   # Request handlers
├── service.ts      # Business logic
├── validators.ts   # Zod schemas
├── openapi.ts      # OpenAPI route documentation (optional)
├── socket.ts       # WebSocket handlers (optional)
├── middleware.ts   # Plugin middleware (optional)
├── types/          # Plugin-specific types
│   ├── index.ts
│   └── express.d.ts
├── events/         # Kafka producers/consumers (optional)
│   ├── producer.ts
│   └── consumer.ts
└── __tests__/      # Plugin tests
```

4. Create `index.ts` with plugin definition:

```typescript
import { Plugin, PluginContext } from '../../core/types';
import { Router } from 'express';
import { setupRoutes } from './routes';

const plugin: Plugin = {
  name: 'your-plugin',
  version: '1.0.0',

  async onLoad(ctx: PluginContext) {
    ctx.logger.info('Plugin loading...');
  },

  async onEnable(ctx: PluginContext) {
    ctx.logger.info('Plugin enabled');
  },

  routes(router: Router) {
    setupRoutes(router);
  },

  async onDisable(ctx: PluginContext) {
    ctx.logger.info('Plugin disabled');
  },

  async onUnload(ctx: PluginContext) {
    ctx.logger.info('Plugin unloading...');
  },
};

export default plugin;
```

## Plugin Lifecycle

```
onLoad → onEnable → (running) → onDisable → onUnload
```

| Hook        | When Called         | Use Case                           |
| ----------- | ------------------- | ---------------------------------- |
| `onLoad`    | Plugin first loaded | Initialize resources               |
| `onEnable`  | Plugin activated    | Start services, register listeners |
| `onDisable` | Plugin deactivated  | Stop services, cleanup             |
| `onUnload`  | App shutdown        | Final cleanup, close connections   |

## Event System

Plugins communicate via typed events without direct imports:

```typescript
// Emit an event (typed)
ctx.events.emitEvent('auth:user-created', { userId: '123', email: 'user@example.com' });

// Listen to events (typed)
ctx.events.onEvent('auth:user-created', (data) => {
  console.log('User created:', data.userId);
});
```

### Available Events

| Event                  | Payload             |
| ---------------------- | ------------------- |
| `auth:user-created`    | `{ userId, email }` |
| `auth:user-logged-in`  | `{ userId, email }` |
| `auth:user-logged-out` | `{ userId }`        |
| `plugin:loaded`        | `{ name, version }` |
| `plugin:enabled`       | `{ name }`          |
| `plugin:disabled`      | `{ name }`          |
| `system:shutdown`      | `{ reason }`        |

## Kafka Messaging

When `KAFKA_ENABLED=true`, plugins can publish/consume messages:

```typescript
// Publish a message
import { sendMessage } from '../../shared/messaging';
await sendMessage('my-topic', { data: 'hello' }, 'optional-key');

// Create a consumer
import { createConsumer } from '../../shared/messaging';
await createConsumer('my-group', ['my-topic'], async (message, metadata) => {
  console.log('Received:', message);
});
```

## WebSocket (Socket.io)

Real-time communication is enabled when `WS_ENABLED=true`. Socket.io server runs on the same port as the HTTP server.

### Client Connection

```typescript
import { io } from 'socket.io-client';

// Connect with JWT authentication
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' },
});

// Or via query parameter
const socket = io('http://localhost:4000?token=your-jwt-token');
```

### Server-to-Client Events

| Event                  | Payload                | Description         |
| ---------------------- | ---------------------- | ------------------- |
| `auth:user-logged-in`  | `{ userId, email }`    | User logged in      |
| `auth:user-logged-out` | `{ userId }`           | User logged out     |
| `auth:user-created`    | `{ userId, email }`    | New user registered |
| `system:notification`  | `{ type, message }`    | System notification |
| `broadcast`            | `{ channel, payload }` | Channel broadcast   |
| `error`                | `{ code, message }`    | Error message       |

### Client-to-Server Events

| Event         | Payload   | Response                    | Description          |
| ------------- | --------- | --------------------------- | -------------------- |
| `ping`        | -         | `{ pong: true, timestamp }` | Connection health    |
| `join-room`   | `roomId`  | `{ success, error? }`       | Join a room          |
| `leave-room`  | `roomId`  | `{ success }`               | Leave a room         |
| `subscribe`   | `channel` | `{ success, error? }`       | Subscribe to channel |
| `unsubscribe` | `channel` | `{ success }`               | Unsubscribe          |

### Plugin WebSocket Usage

Plugins have access to the Socket.io server via `ctx.io`:

```typescript
// In plugin onEnable hook
async onEnable(ctx: PluginContext): Promise<void> {
  if (ctx.io) {
    // Setup custom socket handlers
    ctx.io.on('connection', (socket) => {
      socket.on('my-event', (data) => {
        // Handle event
      });
    });
  }
}

// Emit to specific user
import { emitToUser } from '../../shared/websocket';
emitToUser(userId, 'auth:user-logged-in', { userId, email });

// Broadcast to all
import { broadcast } from '../../shared/websocket';
broadcast('system:notification', { type: 'info', message: 'Hello!' });
```

## Scripts

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm run dev`                | Start development server with hot reload |
| `npm run build`              | Build TypeScript to JavaScript           |
| `npm start`                  | Start production server                  |
| `npm run lint`               | Run ESLint                               |
| `npm run format`             | Format code with Prettier                |
| `npm test`                   | Run all tests                            |
| `npm run test:coverage`      | Run tests with coverage                  |
| `npm run prisma:generate`    | Generate Prisma client                   |
| `npm run prisma:migrate:dev` | Run database migrations                  |

## Docker Compose Services

| Service    | Port | Profile |
| ---------- | ---- | ------- |
| PostgreSQL | 5432 | default |
| Redis      | 6379 | default |
| Zookeeper  | 2181 | kafka   |
| Kafka      | 9092 | kafka   |
| Kafka UI   | 8080 | kafka   |

```bash
# Start default services (postgres, redis)
docker compose up -d

# Start with Kafka
docker compose --profile kafka up -d
```

## License

MIT
