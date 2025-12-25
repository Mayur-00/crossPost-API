import { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateLinkedinPostSchema, LinkedInCallbackSchema } from './linkedin.dto.js';
import { Logger } from 'winston';
import { jwtToken } from '../shared/jwt/jwtCookie.service.js';
import { linkedinServices } from './linkedin.services.js';
import { ApiError } from '../../utils/apiError.js';
import { PostServices } from './post.services.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import crypto from 'crypto'

export class LinkedinController {
  constructor(
    private linkedinService: linkedinServices,
    private postServices: PostServices,
    private logger: Logger,
    private jwtToken: jwtToken,
  ) {}

  startAuth : RequestHandler = asyncHandler(async (req:Request, res:Response) => {

    if(!req.user){
      this.logger.error("unAuthorized Request");
      throw new ApiError(401, "UnAuthorized");
    };
    const state = crypto.randomBytes(32).toString('hex');

    const session = await this.linkedinService.createOAuthSession(req.user.id, state );
    const url = this.linkedinService.generateAuthUrl(state);

    res.status(200).json(new ApiResponse(200, url, 'Session Started'))
  });

  handleLinkedinAuthCallback: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error, error_description } = LinkedInCallbackSchema.parse(req.query);

    this.logger.info("code", {code:code})
    if (error) {
     return  res.redirect(
        `${process.env.FRONTEND_URI}/error?error=${error_description || 'Authentication_Failed'}`,
      );
     
    }

    const session = await this.linkedinService.getOAuthSession(state);
    const userid = session.ownerid;

    const accessTokenServiceResponse = await this.linkedinService.getAccessToken(code);

    const access_token = accessTokenServiceResponse.access_token;

    const userInfoResponse = await this.linkedinService.getUserInfo(access_token);

    await this.linkedinService.createUsersLinkedinConnectionDatabaseRecord(
      userInfoResponse,
      accessTokenServiceResponse,
      userid,
    );

    await this.linkedinService.markSessionAsUsed(session.id);

    this.logger.info('user linkedin connection success', {
      email: userInfoResponse.email,
    });
    res.status(200).redirect(`${process.env.FRONTEND_URI}/home`);
  });

  createLinkedinPost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { post_id } = CreateLinkedinPostSchema.parse(req.body);

    if (!req.user) {
      throw new ApiError(400, 'Unauthorized');
    }

    const userid = req.user.id!;

    // getting linkedin account data from database
    const account = await this.linkedinService.getUserAccount(userid);

    // getting post from databse and validation
    const post = await this.linkedinService.getPostFromDb(post_id, userid);
    if (!post) {
      this.logger.error('post no found');
      throw new ApiError(404, 'Post not found');
    }

    // If post has media
    if (post.mediaUrl) {
      const imageBuffer = await this.linkedinService.getImageBufferFromCloudinary(post.mediaUrl);

      const registerMediaResponse = await this.linkedinService.registerImageUpload(
        account.access_token,
        account.platform_userid,
      );
      const uploadResponse = await this.linkedinService.UploadImageBuffer(
        registerMediaResponse.uploadUrl,
        imageBuffer,
        account.access_token,
      );

      if (!uploadResponse.success) {
        this.logger.error('image buffer upload error ', {
          error: uploadResponse.message,
        });
        throw new ApiError(500, 'internal server error');
      }

      const publishPostResponse = await this.linkedinService.publishPostWithImage(
        registerMediaResponse.asset,
        account.access_token,
        account.platform_userid,
        post.content!,
      );

      const linkedinPostId = publishPostResponse.id;

      await this.linkedinService.createLinkedinPostDatabaseRecord(
        userid,
        post.id,
        account.id,
        'POSTED',
        linkedinPostId,
        new Date(Date.now()),
      );

      this.logger.info('post created successfully');
    return  res.status(201).json(new ApiResponse(201, post, 'crossPosted'));
    }

    // if post doesn't have any media
    const publishTextPost = await this.linkedinService.publishTextPost(
      account.platform_userid,
      post.content!,
      account.access_token,
    );
    const linkedinPostId = publishTextPost.id;

    await this.linkedinService.createLinkedinPostDatabaseRecord(
      userid,
      post.id,
      account.id,
      'POSTED',
      linkedinPostId,
      new Date(Date.now()),
    );

    // sending response
    this.logger.info('post published successfully');
    res.status(201).json(new ApiResponse(200, post, 'post published successfully on Linkedin'));
  });
}
