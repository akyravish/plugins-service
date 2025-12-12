# Plugin Arc - Modular Plugin Architecture

A production-ready Node.js plugin-based modular system built with Express.js and TypeScript. Features dynamic plugin loading, lifecycle management, and event-based inter-plugin communication.

## Features

- **Plugin Architecture**: Independent, hot-swappable plugins with lifecycle hooks
- **Event-Driven**: Inter-plugin communication via typed event emitter
- **Type-Safe**: Full TypeScript with strict mode
- **Production Ready**: Security headers, rate limiting, graceful shutdown
- **Scalable**: Redis-backed rate limiting, PostgreSQL with Prisma

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL
- Redis

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
│   ├── shared/         # Infrastructure (db, cache, events)
│   └── plugins/        # Plugin modules
├── prisma/             # Database schema and migrations
└── tests/              # Test files
```

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

3. Create `index.ts` with plugin definition:

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

## API Endpoints

### Health Check

- `GET /health` - System health status

### Auth Plugin

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

## Scripts

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development server with hot reload |
| `npm run build`         | Build TypeScript to JavaScript           |
| `npm start`             | Start production server                  |
| `npm run lint`          | Run ESLint                               |
| `npm run format`        | Format code with Prettier                |
| `npm test`              | Run all tests                            |
| `npm run test:coverage` | Run tests with coverage                  |

## Plugin Lifecycle

```
onLoad → onEnable → (running) → onDisable → onUnload
```

- **onLoad**: Called when plugin is first loaded
- **onEnable**: Called when plugin is activated
- **onDisable**: Called when plugin is deactivated
- **onUnload**: Called during application shutdown

## Event System

Plugins communicate via events without direct imports:

```typescript
// Emit an event
ctx.events.emit('auth:user-created', { userId: '123' });

// Listen to events
ctx.events.on('auth:user-created', (data) => {
  console.log('User created:', data.userId);
});
```

## License

MIT
# plugins-service
