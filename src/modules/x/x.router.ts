import { Router } from 'express';

import { authorize } from '../../middlewares/auth.middleware';
import { upload } from '../../config/multerr.config';
import { XController } from './x.controller';

export function createXRoutes(controller: XController): Router {
  const router = Router();

  // OAuth flow
  router.get('/callback', controller.handleCallback);
  router.post('/auth', authorize, controller.getAuth);

  // Account management (requires authentication)
  //   router.get('/accounts', authorize, controller.);

  // Post creation (requires authentication and file upload)
//   router.post(
//     '/posts',
//     authorize,
//     upload.single('image'), // Multer middleware
//     controller.createLinkedinPost,
//   );

  return router;
}
