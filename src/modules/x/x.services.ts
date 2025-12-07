import axios, { Axios } from 'axios';
import { Logger } from 'winston';
import crypto from 'crypto';
import { PrismaClient, SocialAccount } from '../../generated/prisma/client';
import { ApiError } from '../../utils/apiError';
import { XTokenResponse, XUserInfo } from './x.types';
import { ApiResponse } from '../../utils/apiResponse';
import { TweetDbRecord, TweetResponse } from './x.dto';

import FormData from 'form-data';
export class XServices {
  constructor(
    private httpClient: Axios = axios,
    private logger: Logger,
    private prismaClient: PrismaClient,
  ) {}

  generatePKCE() {
    const code_verifier = crypto.randomBytes(32).toString('hex');

    const hash = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return {
      code_verifier,
      code_challenge: hash,
    };
  }
  async getOAuthSession(state: string) {
    try {
      const session = await this.prismaClient.oAuthSession.findUnique({
        where: { state },
      });

      if (!session) throw new ApiError(400, 'Invalid state parameter');
      if (session.used) throw new ApiError(400, 'State already used');
      if (session.expiresAt < new Date()) {
        await this.prismaClient.oAuthSession.delete({ where: { id: session.id } });
        throw new ApiError(400, 'OAuth session expired');
      }

      this.logger.info('session get success', { id: session?.id });

      return session;
    } catch (error) {
      this.logger.error('an error occured while geting oauth session from db', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async markSessionAsUsed(sessionId: string) {
    await this.prismaClient.oAuthSession.update({
      where: { id: sessionId },
      data: { used: true },
    });
  }
  async createOAuthSession(userid: string, code_verifier: string, state: string) {
    try {
      this.logger.info(`session creation, codeVerifier:${code_verifier}`);
      return await this.prismaClient.oAuthSession.create({
        data: {
          ownerid: userid,
          codeVerifier: code_verifier,
          provider: 'X',
          state: state,
        },
      });
    } catch (error) {
      this.logger.error('an error occured while creation oauth session', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }
  async getAccessToken(code_verifier: string, code: string) {
    const clientId = process.env.X_CLIENT_ID!;
    const clientSecret = process.env.X_CLIENT_SECRET!;

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    this.logger.info(`Exchanging code for token - codeVerifier:${code_verifier}, code:${code}`);

    const tokenRes = await this.httpClient.post(
      'https://api.x.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: process.env.X_REDIRECT_URI!,
        code_verifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      },
    );

    return tokenRes;
  }
  async getXUserInfo(accessToken: string) {
    try {
      const response = await this.httpClient.get<XUserInfo>('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          'user.fields':
            'id,name,username,profile_image_url,description,public_metrics,verified,created_at',
        },
      });
      return response;
    } catch (error) {
      this.logger.error('an error occured while asking for user info', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }
  async createDbUsersXConnection(userId: string, userInfo: XUserInfo, tokenObj: XTokenResponse) {
    try {
      return await this.prismaClient.socialAccount.create({
        data: {
          owner_id: userId,
          platform: 'X',
          platform_userid: userInfo.data.id,
          username: userInfo.data.username,
          profile_picture: userInfo.data.profile_image_url,
          access_token: tokenObj.access_token,
          token_expiry: new Date(Date.now() + tokenObj.expires_in * 1000),
          refresh_token: tokenObj.refresh_token,
          platformData: userInfo.data,
          lastSync: new Date(Date.now()),
        },
      });
    } catch (error) {
      this.logger.error('an error occured while saving user info into db', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }
  async refreshAccessToken(refreshToken: string) {
    try {
      const clientId = process.env.X_CLIENT_ID!;
      const clientSecret = process.env.X_CLIENT_SECRET!;

      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await this.httpClient.post(
        'https://api.x.com/2/oauth2/token',
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      return res.data;
    } catch (error) {
      this.logger.error(`an error occured while refreshing accessToken`, { error: error });
      throw new ApiError(500, 'account expired reconnect your account');
    }
  }
  async getActiveXAccount(userid: string) {
    try {
      return await this.prismaClient.socialAccount.findFirst({
        where: {
          owner_id: userid,
          platform: 'X',
        },
      });
    } catch (error) {
      this.logger.error('cannot get x active account', { error: error });
      throw new ApiError(500, 'account not found');
    }
  }
  async validateAccessToken(account: SocialAccount) {
    try {
      const now = Date.now();
      const isExpired = !account.token_expiry || account.token_expiry.getTime() <= now;

      if (isExpired) {
        if (!account.refresh_token) {
          this.logger.warn('no refresh token available for account', { accountId: account.id });
          throw new ApiError(401, 'account expired reconnect your account');
        }

        const tokenObj = await this.refreshAccessToken(account.refresh_token);

        await this.prismaClient.socialAccount.update({
          where: { id: account.id },
          data: {
            access_token: tokenObj.access_token,
            refresh_token: tokenObj.refresh_token ?? account.refresh_token,
            token_expiry: new Date(Date.now() + tokenObj.expires_in * 1000),
          },
        });

        return tokenObj.access_token;
      }

      return account.access_token;
    } catch (error) {
      this.logger.error('an error occured while validating access token', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }
  async publishTweet(text: string, mediaIds: string[], accessToken: string): Promise<TweetResponse> {
    try {
     const payload: any = { text };

    if (mediaIds && mediaIds.length > 0) {
      payload.media = {
        media_ids: mediaIds,   // ✔ CORRECT FIELD
      };
    }

      const tweet = await this.httpClient.post<TweetResponse>(
        'https://api.x.com/2/tweets',
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return tweet.data;
    } catch (error) {
      this.logger.error(`an error occured while publishing the tweet ${error}`);
      throw new ApiError(500, 'publishing tweets failed');
    }
  }
  async uploadMedia(accessToken: string, buffer: Buffer, mimetype: string) {
    try {
      const form = new FormData();
      form.append('media', buffer, {
        filename: 'upload',
        contentType: mimetype,
      });
      form.append('media_type', mimetype);
      form.append('media_category', 'tweet_image');

      const res = await axios.post('https://api.x.com/2/media/upload', form, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...form.getHeaders(),
        },
      });
      this.logger.info(`image upload response : ${res.data}`);
      console.log(res.data )
      console.log(res.data.data )
      return res.data.data.id;
    } catch (error) {
      this.logger.error(`unable to upload media error:${error}`);
      throw new ApiError(500, 'image upload failed');
    }
  }

  async getPost(post_id: string, userid: string) {
    try {
      const post = await this.prismaClient.post.findUnique({
        where: {
          id: post_id,
          owner_id: userid,
        },
      });
      return post;
    } catch (error) {
      this.logger.info('an error occured while geting post ', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async getImageBufferFromCloudinary(image_url: string) {
    try {
      const response = await this.httpClient.get(image_url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.info('an error occured while getting image from cloudinary', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async createTweetDbRecord(data: TweetDbRecord) {
    try {
      const record = await this.prismaClient.platformPost.create({
        data: {
          owner_id: data.ownerId,
          post_id: data.postId,
          account_id: data.xAccountId,
          platform: 'X',
          platform_post_id: data.tweetId,
          platform_post_url: `https://x.com/i/web/status/${data.tweetId}`,
          status: 'POSTED',
          postedAt: new Date(Date.now()),
        },
      });

      return record;
    } catch (error) {
      this.logger.error('an error occrred while creating db record', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }
}
