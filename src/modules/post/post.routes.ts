

import { Router } from 'express';
import { authorize } from '../../middlewares/auth.middleware';
import { upload } from '../../config/multerr.config';
import { PostController } from './post.controller';

export function createPostRoutes(controller: PostController): Router {
  const router = Router();



  // Post creation (requires authentication and file upload)
  router.post(
    '/create',
    authorize,
    upload.single('image'), 
    controller.publishPostMultiplePlatforms,
  );
  
  return router;
}
