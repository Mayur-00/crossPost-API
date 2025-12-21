import { Logger } from 'winston';
import { Post, PrismaClient } from '../../generated/prisma/client.js';
import { ApiError } from '../../utils/apiError.js';

export class PostService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
  ) {}

  async createPost(content: string, media_url: string, user_id: string, mimeType:string) {
    try {
      const post = await this.prisma.post.create({
        data: {
          content: content || "",
          mediaUrl: media_url ||" ",
          owner_id: user_id,
          status: 'CREATED',
          mediaType:mimeType
        },
      });

      this.logger.info('Post Created', { postid: post.id });

      return post;
    } catch (error) {
      this.logger.error("Couldn't Create Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }

  async updatePost(new_content: string, new_media_url: string, user_id: string) {
    try {
      return await this.prisma.post.update({
        where: {
          id: user_id,
        },
        data: {
          content: new_content,
          mediaUrl: new_media_url,
          status:'UPLOADED'
        },
      });
    } catch (error) {
      this.logger.error("Couldn't Update The Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }

  async deletePost(user_id: string, post_id: string) {
    try {
      const post = await this.prisma.post.delete({
        where: {
          id: post_id,
          owner_id: user_id,
        },
      });

      this.logger.info('Post Deleted Success', { return_value: post });

      return true;
    } catch (error) {
      this.logger.error("Couldn't Delete The Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }

  async getPostById(post_id: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: {
          id: post_id,
        },
        include:{
          platform_post : {
            select:{
              id:true,
              platform_post_url:true,
              platform:true,
              status:true,
              postedAt:true
              
            }
          }
        }
      });
      this.logger.info('Post Fetched Successfully ');
      return post;
    } catch (error) {
      this.logger.error("Couldn't get The Post ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }

  async getAllPosts(user_id: string): Promise<Post[]> {
    try {
      const posts = await this.prisma.post.findMany({
        where: {
          owner_id: user_id,
        },
      });

      return posts;
    } catch (error) {
      this.logger.error("Couldn't get The Posts ", { error: error });
      throw new ApiError(500, 'Internal Server Error');
    }
  }
}
