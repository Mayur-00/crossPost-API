import { Logger } from "winston";
import { linkedinServices } from "../../modules/linkedin/linkedin.services.js";
import { PostJobData } from "../worker.types.js";

export class linkedinHandler {

    constructor(private linkedinServices:linkedinServices, private logger:Logger){}

     async handle(jobData: PostJobData): Promise<any> {
    const { postId, userId, content, mediaUrl } = jobData;

    try {
      // Get account
      const isAlreadyPosted = await this.linkedinServices.isAlreadyPosted(postId);
      if(isAlreadyPosted){
        this.logger.info('post is already posted on linkedin')
        return;
      }

      const account = await this.linkedinServices.getUserAccount(userId);
      if (!account) {
        throw new Error('No active LinkedIn account found');
      }

      // Validate token
      const result = await this.linkedinServices.validateAccessToken(account);
      if (!result.success) {
        throw new Error('Account expired');
      }

      let publishPost: any;

      if (mediaUrl) {
        // Post with image
        const registerImageResponse = await this.linkedinServices.registerImageUpload(
          account.access_token,
          account.platform_userid
        );

        const imageObj = await this.linkedinServices.getImageBufferFromCloudinary(mediaUrl);

        const upload = await this.linkedinServices.UploadImageBuffer(
          registerImageResponse.uploadUrl,
          imageObj.buffer,
          account.access_token
        );

        if (!upload.success) {
          throw new Error('Failed to upload image');
        }

        publishPost = await this.linkedinServices.publishPostWithImage(
          registerImageResponse.asset,
          account.access_token,
          account.platform_userid,
          content
        );
      } else {
        // Text-only post
        publishPost = await this.linkedinServices.publishTextPost(
          account.platform_userid,
          content,
          account.access_token
        );
      }

      // Save to DB
      const platformPost =  await this.linkedinServices.createLinkedinPostDatabaseRecord(
        userId,
        postId,
        account.id,
        'POSTED',
        publishPost.id,
        new Date()
      );

      

      this.logger.info(`post successfully published to LinkedIn ${postId}`);
      return { success: true, platformPostId: platformPost.id };
    } catch (error) {
      this.logger.error(`post publishing failed with error: ${ error}`);
      throw error;
    }
  }
};