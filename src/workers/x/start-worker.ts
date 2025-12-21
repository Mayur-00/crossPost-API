/**
 * Standalone X Post Worker
 * add to package.json: "worker:x": "node --loader ts-node/esm src/workers/x/start-worker.ts"
 */

import dotenv from 'dotenv';
import { xPostWorker } from './x.worker.js';
import logger from '../../config/logger.config.js';

dotenv.config();

// Start the worker
logger.info('🚀 Starting X Post Worker on separate process...');

// Handle shutdown gracefully
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down X worker gracefully...');
    await xPostWorker.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down X worker gracefully...');
    await xPostWorker.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
