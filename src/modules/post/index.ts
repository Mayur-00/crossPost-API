import { PostService } from "./post.services";
import prisma from '../../config/prisma';
import logger from "../../config/logger.config";
import { PostController } from "./post.controller";
import { createPostRoutes } from "./post.routes";
import { LinkedinService } from "../linkedin";
import { xServices } from "../x";

export  const postServices = new PostService(prisma, logger);

export const postController = new PostController(logger,postServices, LinkedinService, xServices);

export const postRoutes = createPostRoutes(postController);

export * from './post.dto'
