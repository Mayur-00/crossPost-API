import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { User } from '../generated/prisma/client.js';
import logger from '../config/logger.config.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authorize: RequestHandler = asyncHandler(
  async (req, res, next) => {
  

    const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

    let decoded: myJwtPayload;

    try {
      decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as myJwtPayload;
    } catch {
      throw new ApiError(401, "Invalid or expired access token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();
  }
);

export interface myJwtPayload extends jwt.JwtPayload {
  id: string;
  name?: string;
  email?: string;
}
