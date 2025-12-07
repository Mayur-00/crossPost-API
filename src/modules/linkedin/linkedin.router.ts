import { Router } from 'express';
import { LinkedinController } from './linkedin.controller';
import { authorize } from '../../middlewares/auth.middleware';
import { upload } from '../../config/multerr.config';

export function createLinkedInRoutes(controller: LinkedinController): Router {
  const router = Router();

  // OAuth flow
  router.get('/auth', authorize, controller.startAuth);
  router.get('/callback', controller.handleLinkedinAuthCallback);


  // Post creation (requires authentication and file upload)
  router.post(
    '/posts',
    authorize,
    upload.single('image'), // Multer middleware
    controller.createLinkedinPost,
  );

  return router;
}
