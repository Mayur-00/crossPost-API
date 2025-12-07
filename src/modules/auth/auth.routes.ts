import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authorize } from '../../middlewares/auth.middleware';

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  // OAuth flow
  router.post('/google', controller.handleGoogleLogin);
  router.post('/register', controller.handleRegister);
  router.post('/login', controller.handleLogin);
  router.post('/refresh-access', controller.handleAccessTokenRefresh);
  router.get('/user', authorize, controller.user);
  router.get('/logout', authorize, controller.handleLogout);
  router.get('/delete', authorize, controller.handleDeleteAccountRequest);

  return router;
}
