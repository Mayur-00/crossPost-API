import { linkedinServices } from './linkedin.services.js';
import prisma from '../../config/prisma.js';
import logger from '../../config/logger.config.js';
import axios from 'axios';
import { PostServices } from './post.services.js';
import { LinkedinController } from './linkedin.controller.js';
import { createLinkedInRoutes } from './linkedin.router.js';
import { jwtToken } from '../shared/jwt/jwtCookie.service.js';
import dotenv from 'dotenv';
dotenv.config()

export const LinkedinService = new linkedinServices(prisma, logger, axios, {
  clientID: process.env.LINKEDIN_CLIENT_ID!,
  clientSecret: process.env.LINKEDIN_PRIMARY_CLIENT_SECRET!,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI!,
});

export const postServices = new PostServices(prisma, logger);

export const jwtService = new jwtToken()

export const linkedinController = new LinkedinController(LinkedinService, postServices, logger,jwtService );

export const linkedinRoutes = createLinkedInRoutes(linkedinController);
