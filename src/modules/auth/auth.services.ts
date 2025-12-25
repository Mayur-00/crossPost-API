import { Logger } from 'winston';
import { PrismaClient, User } from '../../generated/prisma/client.js';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../../utils/apiError.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { myJwtPayload } from '../../middlewares/auth.middleware.js';

export class UserServices {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private googleClient: OAuth2Client,
    private googleClientId: string,
  ) {}

  async verifyGoogleIdTokn(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.googleClientId,
      });

      const payload = ticket.getPayload();

      return payload;
    } catch (error) {
      this.logger.error('id token verification failed', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async getUserById(id: string) {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
    } catch (error) {
      this.logger.error('an error occored while fetching user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async getUserByIdWithConnectedAccounts(id: string) {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        include: {
          connected_accounts: {
            select: {
              platform: true,
              display_name: true,
              profile_picture: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('an error occored while fetching user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async getUserByEmail(email: string) {
    try {
      return await prisma?.user.findUnique({
        where: {
          email: email,
        },
      });
    } catch (error) {
      this.logger.error('an error occored while fetching user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }

  async createUser(
    name: string,
    email: string,
    provider: string,
    password?: string,
    providerid?: string,
    profilePic?: string,
    refreshToken?: string,
  ): Promise<User> {
    try {
      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 12);
      }

      const user = await this.prisma.user.create({
        data: {
          name: name,
          email: email,
          provider: provider === 'GOOGLE' ? 'GOOGLE' : 'CREDENTIAL',
          password: hashedPassword,
          provider_id: providerid,
          profile_picture: profilePic,
          refresh_token: refreshToken,
        },
      });

      return user;
    } catch (error) {
      this.logger.error('an error occured during user creation', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async updateUser(
    email: string,
    provider: string,
    providerid?: string,
    profilePic?: string,
    refreshToken?: string,
  ): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: {
          email: email,
        },

        data: {
          provider: provider === 'GOOGLE' ? 'GOOGLE' : 'CREDENTIAL',
          provider_id: providerid,
          profile_picture: profilePic,
          refresh_token: refreshToken,
        },
      });

      return user;
    } catch (error) {
      this.logger.error('an error occured during user creation', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }

  async updateUsersRefreshToken(userid: string, refreshToken: string): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: {
          id: userid,
        },
        data: {
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      this.logger.error('an error occured while updating user', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }
  async clearUsersRefreshToken(userid: string) {
    try {
      const updated = await this.prisma.user.update({
        where: {
          id: userid,
        },
        data: {
          refresh_token: '',
        },
      });

      return updated;
    } catch (error) {
      this.logger.error('an error occured while clearing token', {
        error: error,
      });
      throw new ApiError(500, 'internal server error');
    }
  }

  async verifyRefreshToken(refreshToken: string) {
    try {
      return (await jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!)) as myJwtPayload;
    } catch (error) {
      this.logger.error("token didn't verify", { error: error });
      throw new ApiError(401, 'token expired or invalid');
    }
  }
  async verifyPassword(new_password: string, user_password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(new_password, user_password);
    } catch (error) {
      this.logger.error("token didn't verify", { error: error });
      throw new ApiError(401, 'token expired or invalid');
    }
  };
  async DeleteAccount(userId:string){
    return await this.prisma.user.delete({
      where:{
        id:userId
      }
    })
  }

  async updateUserWithImage (userid:string, imageUrl:string){
    return await this.prisma.user.update({
      where:{
        id:userid
      },
      data:{
        profile_picture:imageUrl,
      }
    })
  }
  async updateUsersName (userid:string, name:string){
    return await this.prisma.user.update({
      where:{
        id:userid
      },
      data:{
        name:name
      }
    })
  }
}
