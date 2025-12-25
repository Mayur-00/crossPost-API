import axios, { AxiosInstance } from 'axios';
import { Logger } from 'winston';
import {
  AccessTokenResponseType,
  linkedinAccessTokenResponse,
  linkedInMediaRegisterResponse,
  LinkedinPostPublishResponse,
  LinkedinUserInfoResponse,
  LinkedinUserInfoType,
} from './linkedin.types.js';
import { ApiError } from '../../utils/apiError.js';
import { PlatformPost, PlatfromPostStatus, Post, PrismaClient, SocialAccount } from '../../generated/prisma/client.js';

export class linkedinServices {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private httpClient: AxiosInstance = axios,
    private Config: {
      clientID: string;
      clientSecret: string;
      redirectUri: string;
    },
  ) {}

  async createOAuthSession(userid: string, state: string) {
    try {
      return await this.prisma.oAuthSession.create({
        data: {
          ownerid: userid,
          provider: 'LINKEDIN',
          state: state,
        },
      });
    } catch (error) {
      this.logger.error('an error occured while creation oauth session', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async getOAuthSession(state: string) {
    try {
      const session = await this.prisma.oAuthSession.findUnique({
        where: { state },
      });

      if (!session) throw new ApiError(400, 'Invalid state parameter');
      if (session.used) throw new ApiError(400, 'State already used');
      if (session.expiresAt < new Date()) {
        await this.prisma.oAuthSession.delete({ where: { id: session.id } });
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
    await this.prisma.oAuthSession.update({
      where: { id: sessionId },
      data: { used: true },
    });
  }

  generateAuthUrl(state: string):String {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:this.Config.clientID,
      redirect_uri: this.Config.redirectUri,
      scope: 'openid profile email w_member_social',
      state: state,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async getAccessToken(code: string): Promise<linkedinAccessTokenResponse> {
    try {
      const data = JSON.stringify({
        clientIdExists: !!this.Config.clientID,
        clientIdLength: this.Config.clientID?.length,
        clientIdPrefix: this.Config.clientID?.substring(0, 5),
        clientSecretExists: !!this.Config.clientSecret,
        clientSecretLength: this.Config.clientSecret?.length,
        redirectUri: this.Config.redirectUri,
      });
      this.logger.info(`LinkedIn Config Check : ${data}`);

      this.logger.info(`into the getAccessTokn code: ${code}`);
      const response = await this.httpClient.post<linkedinAccessTokenResponse>(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.Config.redirectUri,
          client_id: this.Config.clientID,
          client_secret: this.Config.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.info('linkedin acccess token obtained by this code', {
        code: code.substring(0, 5),
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        this.logger.error('LinkedIn API Error Response', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else {
        this.logger.error('LinkedIn Request Failed', {
          message: error.message,
          code: error.code,
        });
      }

      if (error.response?.status === 400) {
        const errorData = error.response.data;

        // LinkedIn returns specific error messages
        if (errorData?.error === 'invalid_grant') {
          throw new ApiError(
            400,
            'Authorization code is invalid or expired. Please try logging in again.',
          );
        }

        if (errorData?.error === 'invalid_redirect_uri') {
          throw new ApiError(400, 'Redirect URI mismatch. Please contact support.');
        }

        throw new ApiError(
          400,
          `LinkedIn authentication failed: ${errorData?.error_description || 'Invalid request'}`,
        );
      }

      if (error.response?.status === 401) {
        throw new ApiError(401, 'Invalid client credentials');
      }

      if (error.response?.status === 429) {
        throw new ApiError(429, 'Rate limit exceeded. Please try again later.');
      }

      // Generic error
      throw new ApiError(500, 'Failed to authenticate with LinkedIn');
    }
  }

  async getUserInfo(accessToken: string): Promise<LinkedinUserInfoResponse> {
    try {
      this.logger.info('into getUserInfo function ', { accessToken: accessToken });
      const response = await this.httpClient.get<LinkedinUserInfoResponse>(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.info('user info obtained');
      return response.data;
    } catch (error) {
      this.logger.error('failed to get user info', { error });
      throw new ApiError(500, 'failed to get user info');
    }
  }

  async publishTextPost(
    linkedinUserId: string,
    text: string,
    accessToken: string,
  ): Promise<LinkedinPostPublishResponse> {
    try {
      const response = await this.httpClient.post<LinkedinPostPublishResponse>(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: `urn:li:person:${linkedinUserId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: text,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );

      this.logger.info('Post Published Successfully');
      return response.data;
    } catch (error) {
      this.logger.info('Post Publising Failed', { error });
      throw new ApiError(500, 'Post Publish Failed');
    }
  }

  async registerImageUpload(
    access_token: string,
    linkedin_user_id: string,
  ): Promise<linkedInMediaRegisterResponse> {
    try {
      const response = await this.httpClient.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${linkedin_user_id}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202401',
          },
        },
      );

      this.logger.info('Media Successfully Registered');

      return {
        uploadUrl:
          response.data.value.uploadMechanism[
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
          ].uploadUrl,
        asset: response.data.value.asset,
      };
    } catch (error) {
      this.logger.error('Media Registeration Failed', { error });
      throw new ApiError(500, 'Media Registeration Failed');
    }
  }

  async UploadImageBuffer(uploadUrl: string, imageBuffer: Buffer, access_token: string) {
    try {
      await this.httpClient.put(uploadUrl, imageBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `Bearer ${access_token}`,
        },
      });

      this.logger.info('image buffer upload success');

      return {
        success: true,
        message: 'success',
      };
    } catch (error) {
      this.logger.error('image buffer upload failed', { error });
      throw new ApiError(500, 'media buffer upload Failed');
    }
  }

  async publishPostWithImage(
    asset: string,
    linkedin_access_token: string,
    linkedin_user_id: string,
    text?: string,
  ): Promise<LinkedinPostPublishResponse> {
    try {
      const response = await this.httpClient.post<LinkedinPostPublishResponse>(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: `urn:li:person:${linkedin_user_id}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: text || '',
              },
              shareMediaCategory: 'IMAGE',
              media: [
                {
                  status: 'READY',
                  media: asset,
                },
              ],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${linkedin_access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );

      this.logger.info('Post Published Successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Post Publishing Failed', { error });
      throw new ApiError(500, 'Post Publishing Failed');
    }
  }

  async createUsersLinkedinConnectionDatabaseRecord(
    user_info: LinkedinUserInfoType,
    access_token_obj: AccessTokenResponseType,
    user_id: string,
  ): Promise<SocialAccount> {
    try {
      const socialAccount = await this.prisma.socialAccount.create({
        data: {
          owner_id: user_id,
          platform: 'LINKEDIN',
          platform_userid: user_info.sub,
          display_name: user_info.name,
          profile_picture: user_info.picture,
          access_token: access_token_obj.access_token,
          refresh_token: access_token_obj.refresh_token || null,
          token_expiry: new Date(Date.now() + access_token_obj.expires_in * 1000),
          platformData: user_info,
          lastSync: new Date(),
        },
      });

      this.logger.info('Social Account Database Record Created ');
      return socialAccount;
    } catch (error) {
      this.logger.error('Social Account Database Record Creation Failed', { error: error });
      throw new ApiError(500, 'Account Creation Failed');
    }
  }

  async createLinkedinPostDatabaseRecord(
    user_id: string,
    post_id: string,
    account_id:string,
    status:PlatfromPostStatus,
    linkedin_post_id?: string,
    posted_at?: Date,
  ): Promise<PlatformPost> {
    try {
      const post = await this.prisma.platformPost.create({
        data: {
          post_id: post_id,
          owner_id: user_id,
          account_id:account_id,
          platform: 'LINKEDIN',
          platform_post_id: linkedin_post_id || '',
          platform_post_url: `https://www.linkedin.com/feed/update/${linkedin_post_id}/ ` || '',
          status: status,
          postedAt: posted_at || '',
        },
      });

      this.logger.info('Db Record Creation Success');
      return post;
    } catch (error) {
      this.logger.error('Db Record Creation Failed : ', { error });
      throw new ApiError(500, 'database linkedin post creation failed');
    }
  }

  async getUserAccount(userid: string): Promise<SocialAccount> {
    try {
      const user = await this.prisma.socialAccount.findFirst({
        where: {
          owner_id: userid,
          platform: 'LINKEDIN',
          isActive:true,
          isExpired:false
        },
      });
      if (!user) {
        this.logger.error('account not found');
        throw new ApiError(404, 'account not found , please reconnect to linkedin ');
      }

      this.logger.info('Account Found ');
      return user;
    } catch (error) {
      this.logger.error('account fetch Failed : ', { error });
      throw new ApiError(500, 'database linkedin account fetch failed');
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

  async getPostFromDb(postId: string, userId: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: {
          id: postId,
          owner_id: userId,
        },
      });

      return post;
    } catch (error) {
      this.logger.error('an error occured while getting the post', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }

  async validateAccessToken(account:SocialAccount){
    try {
      const now = Date.now();

      const isExpired = !account.token_expiry || account.token_expiry.getTime() <= now;

      if(isExpired){
        await this.prisma.socialAccount.update({
          where:{
            id:account.id
          },
          data:{
            isActive:false,
            isExpired:true
          }
        })
        return {success:false, message:'Account Expired Please Reconnect', accessToken:''}
      };
      return {success:true, message:'accessToken is valid', accessToken :account.access_token};
    } catch (error) {
      this.logger.error(`an error occured while validating accessToken : ${error}`);
      throw new ApiError(500, "internal server error")
    }
  }

  async flagPostSuccess( postid:string, linkedin_post_id:string,){
    try {
      return await this.prisma.platformPost.update({
        where:{
          id:postid
        },
        data:{
          status:'POSTED',
          platform_post_id:linkedin_post_id,
          platform_post_url: `https://www.linkedin.com/feed/update/${linkedin_post_id}/ ` 
        }
      })
    } catch (error) {
      this.logger.error(`failed to update flag ${error}`);
      throw new ApiError(500, 'internal server error')
    }
  }
}
