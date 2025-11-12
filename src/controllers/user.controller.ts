import e, { Request, Response } from "express";
import { ResponseType } from "../middlewares/error.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { RequestHandler } from "express";
import { googleAuthClient } from "../config/googleOAuth.config";
import { ApiError } from "../utils/apiError";
import { jwtToken } from "../utils/token";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import { ref } from "process";

export const registerWithGoogle: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json(new ApiResponse(401, {}, "token not found"));
    }

    const ticket = await googleAuthClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    if (!ticket) {
      throw new ApiError(500, "verifiaction failed");
    }

    const payload = ticket.getPayload()!;

    if (!payload.email || !payload.name) {
      throw new ApiError(400, "Email not found in token payload");
    }

    let user = await prisma?.user.findUnique({
      where: {
        email: payload.email,
      },
    });

  

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };
    let refreshToken;
    let accessToken;

    if (user) {
      refreshToken = jwtToken.generateRefreshToken(user.id);
      accessToken = jwtToken.generateAccessToken(
        user.id,
        user.email,
        user.name
      );

      await prisma?.user.update({
        where: {
          email: payload.email,
        },
        data: {
          profile_picture: payload.picture,
          provider_id: payload.sub,
          provider: "GOOGLE",
          refresh_token: refreshToken,
        },
      });

      return res
        .status(200)
        .cookie("accessToken", accessToken, options) // set the access token in the cookie
        .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
        .json(
          new ApiResponse(
            200,
            { user: user, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
            "User signin in successfully"
          )
        );
    }

    user = await prisma?.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        profile_picture: payload.picture,
        provider_id: payload.sub,
        provider: "GOOGLE"
      },
    });

    accessToken = jwtToken.generateAccessToken(user.id, user.email, user.name);
    refreshToken = jwtToken.generateRefreshToken(user.id);

    const updatedUser  = await prisma.user.update({
        where:{
            id:user.id
        },
        data:{
            refresh_token:refreshToken
        },
        select:{
            name:true,
            email:true,
            profile_picture:true,
            id:true,
            createdAt:true,
            updatedAt:true
        }
    });





    return res
      .status(200)
      .cookie("accessToken", accessToken, options) // set the access token in the cookie
      .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          "User signin in successfully"
        )
      );
  }
);

export const register: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      email,
      password,
    }: { name: string; email: string; password: string } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(401, "name email password is required");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      throw new ApiError(400, "user already exists please login");
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hash,
        provider: "CREDENTIAL",
      },
    });

    const refreshToken = jwtToken.generateRefreshToken(newUser.id);
    const accessToken = jwtToken.generateAccessToken(
      newUser.id,
      newUser.email,
      newUser.name
    );

    const updatedUser = await prisma.user.update({
      where: {
        id: newUser.id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options) // set the access token in the cookie
      .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          "User register in successfully"
        )
      );
  }
);

export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(401, "name email password is required");
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new ApiError(401, "user not found please register user first");
    }

    const isPassWordCorrect = await bcrypt.compare(password, user.password!);

    if (!isPassWordCorrect) {
      throw new ApiError(401, "incorrect Password");
    }

    const refreshToken = jwtToken.generateRefreshToken(user.id);
    const accessToken = jwtToken.generateAccessToken(
      user.id,
      user.email,
      user.name
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options) // set the access token in the cookie
      .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: user, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          "User register in successfully"
        )
      );
  }
);

export const logout: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const reqUserId = req.user?.id;

    if (!reqUserId) {
      throw new ApiError(401, "unauthenticated");
    }

    const user = await prisma.user.update({
      where: {
        id: reqUserId,
      },
      data: {
        refresh_token: "",
      },
    });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out"));
  }
);

export const user: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const reqUserId = req.user?.id;

  // If there's no authenticated user id on the request, reject
  if (!reqUserId) {
    throw new ApiError(401, "not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: reqUserId,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(new ApiResponse(200, user, "user fetched successfully"));
});
