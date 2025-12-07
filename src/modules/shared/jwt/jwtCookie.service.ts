import jwt from 'jsonwebtoken';
import { ApiError } from '../../../utils/apiError';
import logger from '../../../config/logger.config';
import { myJwtPayload } from '../../../middlewares/auth.middleware';

export class jwtToken {
   generateAccessTokenAndRefreshToken = (id: string, email: string, name: string) => {
    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new ApiError(500, 'token secret not found');
    }

    const accessToken = jwt.sign(
      {
        id: id,
        name: name,
        email: email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: '7d',
      },
    );
    const refreshToken = jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '20d',
    });
    return { accessToken, refreshToken };
  };

   verifyAccessToken = (token: string) => {
    try {
      if (!token) {
        return {
          success: false,
          error: 'token not provided',
        };
      }

      if (!process.env.ACCESS_TOKEN_SECRET) {
        return {
          success: false,
          error: 'token secret not found or not loaded',
        };
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as myJwtPayload;

      return {
        success: true,
        id: decoded.id,
      };
    } catch (error) {
      logger.error('jwt token error', { error });
      throw new ApiError(500, 'server error');
    }
  };
}
