import axios from "axios";
import logger from "../config/logger.config.js";
import { ApiError } from "./apiError.js";

export async function getImageBufferFromCloudinary(image_url: string) {
    try {
      const response = await axios.get(image_url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      logger.info('an error occured while getting image from cloudinary', { error: error });
      throw new ApiError(500, 'internal server error');
    }
  }