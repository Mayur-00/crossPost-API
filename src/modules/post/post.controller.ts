import { RequestHandler, Request, Response } from 'express';
import { Logger } from 'winston';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createPostSchema,
  getPostSchema,
  multerFileSchema,
  publishPostToMultiplePlatfromsSchema,
  publishPostToMultiplePlatfromsSchemaQueued,
} from './post.dto.js';
import { PostService } from './post.services.js';
import { uploadImageToCloudinary } from '../../utils/imageUploader.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { linkedinServices } from '../linkedin/linkedin.services.js';
import { ApiError } from '../../utils/apiError.js';
import { Multer } from 'multer';
import { XServices } from '../x/x.services.js';
import { TweetDbRecord } from '../x/x.dto.js';
import { linkedinQueue, postQueue, XQueue } from '../../queues/queues.js';
import { jobBody } from '../../workers/worker.types.js';

export class PostController {
  constructor(
    private logger: Logger,
    private postServices: PostService,
    private linkedinServices: linkedinServices,
    private xServices: XServices,
  ) {}

  createPost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { content } = createPostSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(400, 'Unauthorized');
    }

    const media_file = multerFileSchema.parse(req.file);

    const media_url = (await uploadImageToCloudinary(media_file.buffer)).secure_url;

    const post = await this.postServices.createPost(
      content,
      media_url,
      req.user.id!,
      media_file.mimetype,
      'CREATED'
    );

    this.logger.info('post created successfully', { postId: post.id });

    res.status(201).json(new ApiResponse(201, post, 'success'));
  });

  getPost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { post_id } = getPostSchema.parse(req.body);
    if (!req.user) {
      throw new ApiError(400, 'Unauthorized');
    }

    const post = await this.postServices.getPostById(post_id);

    if (!post) {
      this.logger.error('post not found');
      throw new ApiError(404, 'post not found');
    }

    this.logger.info('post fetched successfully', { postId: post.id });

    res.status(200).json(new ApiResponse(201, post, 'success'));
  });

  publishPostMultiplePlatforms: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
      const { content, platforms } = publishPostToMultiplePlatfromsSchema.parse(req.body);
      const imageFile = req.file as Express.Multer.File;

      if (!req.user) {
        this.logger.error('UnAuthorized Request');
        throw new ApiError(401, 'You Are Not Authorized');
      }
      let imageUrl;
      if (imageFile) {
        imageUrl = (await uploadImageToCloudinary(imageFile.buffer)).secure_url;
      }

      const post = await this.postServices.createPost(
        content,
        imageUrl || '',
        req.user.id,
        imageFile ? imageFile.mimetype : '',
        'CREATED'
      );

      const result: Record<string, any> = {};

      for (const platform of platforms) {
        switch (platform) {
          case 'LINKEDIN':
            const linkedinAccount = await this.linkedinServices.getUserAccount(req.user.id);

            let linkedinPostid;
            if (imageFile) {
              const registerImageResponse = await this.linkedinServices.registerImageUpload(
                linkedinAccount.access_token,
                linkedinAccount.platform_userid,
              );

              const uploadImageBufferResponse = await this.linkedinServices.UploadImageBuffer(
                registerImageResponse.uploadUrl,
                imageFile.buffer,
                linkedinAccount.access_token,
              );

              if (!uploadImageBufferResponse.success) {
                this.logger.error(
                  `linkedin image buffer upload error : ${uploadImageBufferResponse.message}`,
                );
                throw new ApiError(500, 'linkedin post failed');
              }
              const publishPostResponse = await this.linkedinServices.publishPostWithImage(
                registerImageResponse.asset,
                linkedinAccount.access_token,
                linkedinAccount.platform_userid,
                content,
              );
              linkedinPostid = publishPostResponse.id;
            } else {
              const publishTextPostResponse = await this.linkedinServices.publishTextPost(
                linkedinAccount.platform_userid,
                content,
                linkedinAccount.access_token,
              );
              linkedinPostid = publishTextPostResponse.id;
            }

            const linkedinPost = await this.linkedinServices.createLinkedinPostDatabaseRecord(
              req.user.id,
              post.id,
              linkedinAccount.id,
              'POSTED',
              linkedinPostid,
              new Date(Date.now()),
            );
            result.linkedin = { success: true, data: linkedinPost };
            break;

          case 'X':
            const xAccount = await this.xServices.getActiveXAccount(req.user.id);

            if (!xAccount) {
              this.logger.error('x account not found');
              throw new ApiError(404, 'account not found');
            }
            const accessToken = await this.xServices.validateAccessToken(xAccount);

            let mediaIds = [];

            if (imageFile) {
              const mediaid = await this.xServices.uploadMedia(
                accessToken,
                imageFile.buffer,
                imageFile.mimetype,
              );
              mediaIds.push(mediaid);
            }
            this.logger.info(mediaIds);
            const response = await this.xServices.publishTweet(
              post.content || '',
              mediaIds,
              accessToken,
            );

            const data: TweetDbRecord = {
              ownerId: req.user.id,
              postId: post.id,
              accountId: xAccount.id,
              status: 'POSTED',
              tweetId: response.data.id,
            };
            await this.xServices.createTweetDbRecord(data);

            result.x = { success: true, data: data };
            break;

          default:
            result[platform] = {
              success: false,
              error: 'Unknown platform',
            };
        }
      }

      this.logger.info('Post published to platforms', {
        postId: post.id,
        platforms,
        results: result,
      });

      res.status(200).json(new ApiResponse(200, result, 'Post published to platforms'));
    },
  );
  publishPostMultiplePlatformsQueued: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
      const { content, platforms, imageLink, imageMimeType, scheduledDate } =
        publishPostToMultiplePlatfromsSchemaQueued.parse(req.body);

      if (!req.user) {
        this.logger.error('UnAuthorized Request');
        throw new ApiError(401, 'You Are Not Authorized');
      }

      if (scheduledDate) {
        const post = await this.postServices.createPost(
          content,
          imageLink || '',
          req.user.id,
          imageMimeType || '',
          'SCHEDULED',
        );

        const now = new Date();
        const delay = scheduledDate.getTime() - now.getTime();

        if (delay < 0) {
          throw new ApiError(401, 'Scheduled time must be in the future');
        }

        const data: jobBody = {
          platfroms: platforms,
          postId: post.id,
          userid: req.user.id,
        };

        postQueue.add('post', data, {
          delay: delay,
          jobId: post.id,
        });

          this.logger.info('Post Scheduled Successfuly');
          res.status(200).json(new ApiResponse(203, 'Scheduled successFully'));

      } else{
        const post = await this.postServices.createPost(
          content,
          imageLink || '',
          req.user.id,
          imageMimeType || '',
          'CREATED',
        );

         const data: jobBody = {
        platfroms: platforms,
        postId: post.id,
        userid: req.user.id,
      };

      postQueue.add('post', data, {jobId:post.id});
          this.logger.info('Post Queued to platforms');
          res.status(200).json(new ApiResponse(203, 'post queued successFully'));
      }
    },
  );
}
