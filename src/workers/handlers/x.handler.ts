import { Logger } from "winston";
import { XServices } from "../../modules/x/x.services.js";
import { PostJobData } from "../worker.types.js";

export class Xhandler {
    
    constructor(private xServices: XServices, private logger:Logger){}

      async handle(jobData: PostJobData): Promise<any> {
    const { postId, userId, content, mediaUrl, mediaType } = jobData;

    try {
      // Get account
      const account = await this.xServices.getActiveXAccount(userId);
      if (!account) {
        throw new Error('No active X account found');
      }

      // Validate/refresh token
      const accessToken = await this.xServices.validateAccessToken(account);

      // Upload media if exists
      let mediaIds: string[] = [];
      if (mediaUrl) {
        const buffer = await this.xServices.getImageBufferFromCloudinary(mediaUrl);
        const mediaId = await this.xServices.uploadMedia(
          accessToken,
          buffer,
          mediaType || 'image/jpeg'
        );
        if (mediaId) mediaIds.push(mediaId);
      }

      // Publish tweet
      const response = await this.xServices.publishTweet(content, mediaIds, accessToken);

      // Save to DB
    const platformPost =   await this.xServices.createTweetDbRecord({
        ownerId: userId,
        postId,
        accountId: account.id,
        status: 'POSTED',
        tweetId: response.data.id,
      });

      this.logger.info(`posted sucessfully with postid ${postId}`);
      return { success: true, platformPostId: platformPost.id };
    } catch (error) {
      this.logger.error(`publishing post failed with error : ${error}`);
      throw error;
    }
  };

};