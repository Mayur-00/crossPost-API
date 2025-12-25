import { Logger } from 'winston';
import { UserServices } from './auth.services.js';

import { asyncHandler } from '../../utils/asyncHandler.js';
import { RequestHandler, Request, Response } from 'express';
import { googleLoginSchema, loginSchema, registerUserSchema, updateProfilePictureSchema, updateUserSchema } from './auth.dto.js';
import { jwtToken } from '../shared/jwt/jwtCookie.service.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { uploadImageToCloudinary } from '../../utils/imageUploader.js';

export class AuthController {
  constructor(
    private logger: Logger,
    private userServices: UserServices,
    private jwtToken :jwtToken
  ) {}

  handleGoogleLogin: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { token } = googleLoginSchema.parse(req.body);

    const payload = await this.userServices.verifyGoogleIdTokn(token);
    if (!payload) {
      this.logger.error('payload error ', { payload: payload });
      throw new ApiError(500, 'authenticaion error');
    }

    const user = await this.userServices.getUserByEmail(payload.email!);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    if (user) {
      const { accessToken, refreshToken } = this.jwtToken.generateAccessTokenAndRefreshToken(
        user.id,
        user.email,
        user.name,
      );

      const updatedUser = await this.userServices.updateUser(
        user.email,
        'GOOGLE',
        payload?.sub,
        payload?.picture,
        refreshToken,
      );

      return res
        .status(200)
        .cookie('accessToken', accessToken, options) // set the access token in the cookie
        .cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
        .json(
          new ApiResponse(
            200,
            { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
            'User signin in successfully',
          ),
        );
    }

    const newUser = await this.userServices.createUser(
      payload.name!,
      payload.email!,
      'GOOGLE',
      '',
      payload.sub,
      payload.picture,
    );

    const { accessToken, refreshToken } = this.jwtToken.generateAccessTokenAndRefreshToken(
      newUser.id,
      newUser.email,
      newUser.name,
    );

    const updatedUser = await this.userServices.updateUsersRefreshToken(newUser.id, refreshToken);

    return res
      .status(200)
      .cookie('accessToken', accessToken, options) // set the access token in the cookie
      .cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          'User signin in successfully',
        ),
      );
  });

  handleRegister: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = registerUserSchema.parse(req.body);

    const user = await this.userServices.getUserByEmail(email);

    if (user) {
      this.logger.error('user already existst please login');
      throw new ApiError(401, 'user already exists please login');
    }

    const newUser = await this.userServices.createUser(name, email, 'CREDENTIAL', password);

    const { accessToken, refreshToken } = this.jwtToken.generateAccessTokenAndRefreshToken(
      newUser.id,
      newUser.email,
      newUser.name,
    );

    const updatedUser = await this.userServices.updateUsersRefreshToken(newUser.id, refreshToken);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    return res
      .status(201)
      .cookie('accessToken', accessToken, options) // set the access token in the cookie
      .cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          201,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          'User registered successfully',
        ),
      );
  });

  handleLogin: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await this.userServices.getUserByEmail(email);

    if (!user) {
      this.logger.error('account not found');
      throw new ApiError(404, 'account not found please register');
    }

    const passwordCorrect = await this.userServices.verifyPassword(password, user.password!);

    if (!passwordCorrect) {
      this.logger.error('password incorrect', { password: password });
      throw new ApiError(400, 'Incorrect Password');
    }

    const { accessToken, refreshToken } = this.jwtToken.generateAccessTokenAndRefreshToken(
      user.id,
      user.email,
      user.name,
    );

    const updatedUser = await this.userServices.updateUsersRefreshToken(user.id, refreshToken);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    return res
      .status(200)
      .cookie('accessToken', accessToken, options) // set the access token in the cookie
      .cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
      .json(
        new ApiResponse(
          200,
          { user: updatedUser, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
          'User signin in successfully',
        ),
      );
  });

  handleLogout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const reqUserId = req.user?.id;

    if (!reqUserId) {
      throw new ApiError(401, 'unauthenticated');
    }

    await this.userServices.clearUsersRefreshToken(reqUserId);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    return res
      .status(200)
      .clearCookie('accessToken', options)
      .clearCookie('refreshToken', options)
      .json(new ApiResponse(200, {}, 'User logged out'));
  });

  user: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const reqUserId = req.user?.id;

    if (!reqUserId) {
      this.logger.error('unauthorized request');
      throw new ApiError(401, 'unauthorized');
    }

    const user = await this.userServices.getUserByIdWithConnectedAccounts(reqUserId);

    res.status(200).json(new ApiResponse(200, user, 'success'));
  });

  handleAccessTokenRefresh: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      this.logger.error('no incoming token');
      throw new ApiError(401, 'unauthorized request');
    }

    const decoded = await this.userServices.verifyRefreshToken(incomingRefreshToken);

    const user = await this.userServices.getUserById(decoded.id);
    if (!user) {
      this.logger.error('user not found ', { id: decoded.id });
      throw new ApiError(500, 'internal server error');
    }

    if (incomingRefreshToken !== user?.refresh_token) {
      this.logger.error('refresh token comparison failed');
      throw new ApiError(401, 'invalid token');
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = this.jwtToken.generateAccessTokenAndRefreshToken(
      user.id,
      user.email,
      user.name,
    );

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: refreshToken,
          },
          'accessToken refreshed',
        ),
      );
  });

  handleDeleteAccountRequest: RequestHandler = asyncHandler(async (req:Request, res:Response) => {
    
    if(!req.user){
      this.logger.error(`unAuthorized Request, IP: ${req.ip}`);
      throw new ApiError(400, 'UnAuthorized');
    };

    const response = await this.userServices.DeleteAccount(req.user.id);

    if(!response){
      this.logger.error(`can't delete account due to db failure `);
      throw new ApiError(500, 'Internal Server Error')
    };

        const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    return res
      .status(200)
      .clearCookie('accessToken', options)
      .clearCookie('refreshToken', options)
      .json(new ApiResponse(200, {}, 'Account Deleted Successfully'));
  });

  handleProfilePictureUpdate:RequestHandler = asyncHandler(async(req:Request, res:Response) => {

    const {imageLink}= updateProfilePictureSchema.parse(req.body)

      const updatedUser = await this.userServices.updateUserWithImage(req.user?.id!, imageLink,);

      if(!updatedUser){
        this.logger.error(`failed to update the profile picture`)
      };

      res.status(200).json(new ApiResponse(200, {}, 'profile picture updated'))

  })
  handleProfileNameUpdate:RequestHandler = asyncHandler(async(req:Request, res:Response) => {

    const {name}= updateUserSchema.parse(req.body);

    if(!req.user){
      throw new ApiError(401, 'UnAuthorized')
    }

      const updatedUser = await this.userServices.updateUsersName(req.user.id, name );

      if(!updatedUser){
        this.logger.error(`failed to update the profile picture`)
      };

      res.status(200).json(new ApiResponse(200, {}, 'profile name updated'))

  })
}
