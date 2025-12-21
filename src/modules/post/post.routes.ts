

import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware.js';
import { upload } from '../../config/multerr.config.js';
import { PostController } from './post.controller.js';

export function createPostRoutes(controller: PostController): Router {
  const router = Router();



  // Post creation (requires authentication and file upload)
  
  router.post(
    '/create',
    authorize,
    upload.single('image'), 
    controller.publishPostMultiplePlatforms,
  );
  router.post(
    '/publish-post',
    authorize,
    upload.single('image'),
    controller.publishPostMultiplePlatformsQueued,
  );
  return router;
}
