/**
 * Standalone LinkedIn Post Worker
 * Run with: npm run worker:linkedin
 * Or prod: npm run worker:linkedin:prod
 */

import dotenv from 'dotenv';
import logger from '../config/logger.config.js';
import { postWorker } from './worker.js';


dotenv.config();

// Start the worker
logger.info('🚀 Starting LinkedIn Post Worker on separate process...');

// Handle shutdown gracefully
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down LinkedIn worker gracefully...');
    await postWorker.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down LinkedIn worker gracefully...');
    await postWorker.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
