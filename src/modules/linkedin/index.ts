import { linkedinServices } from './linkedin.services';
import prisma from '../../config/prisma';
import logger from '../../config/logger.config';
import axios from 'axios';
import { PostServices } from './post.services';
import { LinkedinController } from './linkedin.controller';
import { createLinkedInRoutes } from './linkedin.router';
import { jwtToken } from '../shared/jwt/jwtCookie.service';
import dotenv from 'dotenv';
dotenv.config()

export const LinkedinService = new linkedinServices(prisma, logger, axios, {
  clientID: process.env.LINKEDIN_CLIENT_ID!,
  clientSecret: process.env.LINKEDIN_PRIMARY_CLIENT_SECRET!,
  redirectUri: 'http://localhost:5000/api/v1/linkedin/callback',
});

export const postServices = new PostServices(prisma, logger);

export const jwtService = new jwtToken()

export const linkedinController = new LinkedinController(LinkedinService, postServices, logger,jwtService );

export const linkedinRoutes = createLinkedInRoutes(linkedinController);
