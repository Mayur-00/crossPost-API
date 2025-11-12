import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma"
import { User } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authorize:RequestHandler = asyncHandler(async (req:Request, res:Response, next:NextFunction) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
    

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  };

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as myJwtPayload;

   
    const user = await prisma.user.findUnique({
        where: {
            id: decoded.id
        }
    });
  

    if (!user) {
      // Client should make a request to /api/v1/users/refresh-token if they have refreshToken present in their cookie
      // Then they will get a new access token which will allow them to refresh the access token without logging out the user
      throw new ApiError(401, "Invalid access token or access token expired");
    };

    req.user = user;

    next();
  } catch (error:any) {
        throw new ApiError(401, error?.message || "Invalid access token");
  }
})

interface myJwtPayload extends jwt.JwtPayload {
    id:string;
    name?:string;
    email?:string
}

