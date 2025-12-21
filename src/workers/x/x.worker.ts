import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.config.js";
import { jobBody } from "../worker.types.js";
import { xServices } from "../../modules/x/index.js";
import { postServices } from "../../modules/post/index.js";
import logger from "../../config/logger.config.js";

export const xPostWorker = new Worker('x-post', (async (job) => {
    try {
       const {postId, userid, platform_post_id} = job.data as jobBody;
        const post = await postServices.getPostById(postId);
        if(!post){
            logger.error(`post not found with id ${postId}`)
            throw new Error('post not found ')
        };

        const account = await xServices.getActiveXAccount(post.owner_id);

        if(!account){
            logger.error(` x account not found with id ${post.owner_id}`);
            throw new Error('no active x account was found')
        };

        // Validate access token and refresh if needed
        const validAccessToken = await xServices.validateAccessToken(account);

        const mediaIds: string[] = []; // Initialize as array

        if(post.mediaUrl){
            const mediaBuffer = await xServices.getImageBufferFromCloudinary(post.mediaUrl);
            if(!mediaBuffer){
                logger.error(`failed to download image buffer with url ${post.mediaUrl}`);
                throw new Error('failed to download image buffer')
            };

            const imageId = await xServices.uploadMedia(validAccessToken, mediaBuffer, post.mediaType!);
            if(imageId) {
                mediaIds.push(imageId); // Push to array instead of assigning
            }
        };

        const tweetResponse = await xServices.publishTweet(post.content || '', mediaIds, validAccessToken);

        if(!tweetResponse){
            logger.error(`unable to publish tweet `);
            throw new Error('tweet publishing failed')
        };
     
        const flag = await xServices.flagTweetSuccess(platform_post_id, tweetResponse.data.id)

        if(!flag){
            logger.error('db record creating failed');
            throw new Error('db record creating failed')
        }
       
        return true
    } catch (error) {
        logger.error('X Worker Error:', error);
        throw error;
    }
}), {
    connection: redisConnection
});

// Worker event listeners
xPostWorker.on('completed', (job) => {
    logger.info(`✅ X post job ${job.id} completed successfully`);
});

xPostWorker.on('failed', (job, err) => {
    logger.error(`❌ X post job ${job?.id} failed:`, err);
});

xPostWorker.on('error', (err) => {
    logger.error('X Worker process error:', err);
});

// Keep worker alive when run as standalone process
if (import.meta.url === `file://${process.argv[1]}`) {
    logger.info('🚀 X Post Worker started on separate process');
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, closing X worker...');
        await xPostWorker.close();
        process.exit(0);
    });
}