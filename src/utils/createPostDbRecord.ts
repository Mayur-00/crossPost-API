import prisma from '../config/prisma';

export const createPostDatabseRecord = async (
  userid: string,
  content?: string,
  mediaUrl?: string,
) => {
  try {
    if (!userid) {
      return {
        success: false,
        error: 'these params are required',
      };
    }

    if (!mediaUrl && !content?.trim()) {
      return {
        success: false,
        error: 'mediaUrl, content atleast one required',
      };
    }

    let post;

    if (mediaUrl && content) {
      post = await prisma.post.create({
        data: {
          owner_id: userid,
          content: content,
          mediaUrl: mediaUrl,
          status: 'UPLOADED',
        },
      });
    } else if (mediaUrl && !content) {
      post = await prisma.post.create({
        data: {
          owner_id: userid,
          mediaUrl: mediaUrl,
          status: 'UPLOADED',
        },
      });
    } else {
      post = await prisma.post.create({
        data: {
          owner_id: userid,
          content: content,
          status: 'UPLOADED',
        },
      });
    }

    if (!post) {
      return {
        success: false,
        error: 'db record creation failed',
      };
    }

    return {
      success: true,
      data: post,
      message: 'success',
    };
  } catch (error) {
    console.log(`service falied with error : ${error}`);

    return {
      success: false,
      error: `service falied with error : ${error}`,
    };
  }
};
