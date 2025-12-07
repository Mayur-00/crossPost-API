import axios from "axios";
import { XServices } from "./x.services";
import logger from "../../config/logger.config";
import Prisma from "../../config/prisma"
import { XController } from "./x.controller";
import { jwtToken } from "../shared/jwt/jwtCookie.service";
import { createXRoutes } from "./x.router";

 export const xServices = new XServices(axios, logger, Prisma);
 export const jwtService = new jwtToken()
 export const xController = new XController(logger, xServices, Prisma, jwtService);

 export const XRoutes = createXRoutes(xController);


export * from './x.types';
export * from './x.dto';