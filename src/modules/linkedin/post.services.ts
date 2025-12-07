import { PrismaClient } from '../../generated/prisma/client';
import { Logger } from 'winston';
import { ApiError } from '../../utils/apiError';

export class PostServices {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
  ) {}

  async createPost(userid: string, mediaUrl?: string, text?: string) {
    try {
      const post = await this.prisma.post.create({
        data: {
          owner_id: userid,
          content: text || '',
          mediaUrl: mediaUrl || '',
          status: 'UPLOADED',
        },
      });

      this.logger.info('post created successfully');
      return post;
    } catch (error) {
      this.logger.error('an occured while creating post ', { error: error });
      throw new ApiError(500, 'post creation failed');
    }
  }
}
