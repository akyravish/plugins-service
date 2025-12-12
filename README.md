# Plugin Arc - Modular Plugin Architecture

A production-ready Node.js plugin-based modular system built with Express.js and TypeScript. Features dynamic plugin loading, lifecycle management, event-based inter-plugin communication, and Kafka messaging.

## Features

- **Plugin Architecture**: Independent, hot-swappable plugins with lifecycle hooks
- **Event-Driven**: Inter-plugin communication via typed event emitter
- **Kafka Messaging**: Async message queue for event-driven architecture
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
│   │   └── events/     # Typed event emitter
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

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
```

## API Endpoints

### Health Check

- `GET /health` - System health status (database, redis, kafka)

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
