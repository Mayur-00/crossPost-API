import express from 'express';
import { authorize } from '../middlewares/auth.middleware';
import { postLinkedin } from '../controllers/socialAccounts.controller';
import { upload } from '../config/multerr.config';

const router = express();

router.post('/post', authorize, upload.single('image'),  postLinkedin);


export default router;