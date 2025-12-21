
import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.config.js";
import { jobBody } from "../worker.types.js";
import logger from "../../config/logger.config.js";
import { LinkedinService } from "../../modules/linkedin/index.js";

export const linkedinWorker = new Worker('linkedin-post', (
    async (job) => {
        try {
            const {postId, userid, platform_post_id} = job.data as jobBody;
            if(!postId || !postId){
                logger.error(`post id or userid not found`);
                throw new Error('postid not found');
            };

            const post = await LinkedinService.getPostFromDb(postId, userid!);

            if(!post){
                logger.error(`post not found with id : ${postId}`)
                throw new Error('post not found')
            }
            const account = await LinkedinService.getUserAccount(post?.owner_id);

            if(!account){
                logger.error(`user account not found with id: ${post.owner_id}`);
                throw new Error('account not found')
            };

            if(post.mediaUrl){
                const imageObj = await LinkedinService.getImageBufferFromCloudinary(post.mediaUrl);
                if(!imageObj){
                    logger.error(`image not found with url:${post.mediaUrl}`);
                    throw new Error('image not found');
                };

                const registerImageResponse = await LinkedinService.registerImageUpload(account.access_token, account.platform_userid);
                if(!registerImageResponse){
                    logger.error('failed to register image with linkedin api');
                    throw new Error('failed to register image')
                };

                const upload = await LinkedinService.UploadImageBuffer(registerImageResponse.uploadUrl, imageObj.buffer, account.access_token);

                if(!upload.success){
                    logger.error(`failed to upload image`);
                    throw new Error ('failed to upload image')
                };

                const publishPost = await LinkedinService.publishPostWithImage(registerImageResponse.asset, account.access_token, account.platform_userid, post.content ||'');
                
                await LinkedinService.flagPostSuccess(platform_post_id, publishPost.id);
            } else{
                const publishPost = await LinkedinService.publishTextPost(account.platform_userid, post.content || " ", account.access_token);
                await LinkedinService.flagPostSuccess(platform_post_id, publishPost.id)
            }

        } catch (error) {
            logger.error(`LinkedIn Worker Error: ${error}`);
            throw error
        };
    }), {connection: redisConnection}
);

// Worker event listeners
linkedinWorker.on('completed', (job) => {
    logger.info(`✅ LinkedIn post job ${job.id} completed successfully`);
});

linkedinWorker.on('failed', (job, err) => {
    logger.error(`❌ LinkedIn post job ${job?.id} failed:`, err);
});

linkedinWorker.on('error', (err) => {
    logger.error('LinkedIn Worker process error:', err);
});

// Keep worker alive when run as standalone process
if (import.meta.url === `file://${process.argv[1]}`) {
    logger.info('🚀 LinkedIn Post Worker started on separate process');
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, closing LinkedIn worker...');
        await linkedinWorker.close();
        process.exit(0);
    });
}