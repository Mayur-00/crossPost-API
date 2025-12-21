# X Post Worker - Standalone Process Guide

## Overview
The X Post Worker now runs as a **separate, independent process** from the main API server. This provides better resource isolation and scalability.

## How to Start

### Development Mode (with auto-reload)
```bash
npm run worker:x
```

### Production Mode
First build the project:
```bash
npm run build
```

Then start the worker:
```bash
npm run worker:x:prod
```

## Architecture

### Main Server (API)
```bash
npm run dev
# Handles HTTP requests on port 3000
# Queues jobs to Redis
```

### X Worker (Separate Process)
```bash
npm run worker:x
# Listens to 'x-post' queue in Redis
# Processes X/Twitter posting jobs
# Can run on same machine or different server
```

## How It Works

1. **Job Creation**: API Server adds jobs to the 'x-post' queue
2. **Job Processing**: X Worker picks up jobs from Redis queue
3. **Async Processing**: Jobs processed independently without blocking API
4. **Status Updates**: Worker updates database with results

## Configuration

The worker uses:
- **Queue Name**: `x-post`
- **Redis Connection**: Configured from `config/redis.config.ts`
- **Job Attempts**: 2 retries with exponential backoff
- **Database**: Prisma for persistence

## Monitoring

The worker logs all activities:
```
✅ X post job [id] completed successfully
❌ X post job [id] failed: [error message]
🚀 X Post Worker started on separate process
```

## Deployment Options

### Option 1: Same Server
Run both on same server in different processes:
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: X Worker
npm run worker:x:prod
```

### Option 2: Docker Containers
```dockerfile
# For API
CMD ["npm", "run", "start"]

# For Worker
CMD ["npm", "run", "worker:x:prod"]
```

### Option 3: Separate Servers
Run worker on different machine with same Redis:
```bash
# On worker machine
npm install
npm run build
npm run worker:x:prod
```

## Environment Variables
Ensure both processes have access to:
- `REDIS_URL` - Redis connection string
- `DATABASE_URL` - Prisma database URL
- `NODE_ENV` - Environment (development/production)

## Graceful Shutdown
The worker handles shutdown signals gracefully:
- `SIGTERM`: Waits for current jobs to complete before exiting
- `SIGINT` (Ctrl+C): Same graceful shutdown behavior
