

import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware.js';
import { upload } from '../../config/multerr.config.js';
import { PostController } from './post.controller.js';

export function createPostRoutes(controller: PostController): Router {
  const router = Router();



  // Post creation (requires authentication and file upload)

  router.post(
    '/publish-post',
    authorize,
    upload.single('image'),
    controller.publishPostMultiplePlatformsQueued,
  );

  //get all posts with pagination and limit
  router.get("/all/posts", authorize, controller.getAllPosts);
  // get posts by query endpoing  with pagination, limit, and type
  router.get("/query/posts", authorize, controller.getSearchedPosts);

  return router;
}
