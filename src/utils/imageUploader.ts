import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
// Don't forget to install @types/multer if you haven't: npm install @types/multer
import { Express } from 'express';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

/**
 * Uploads a Multer file buffer to Cloudinary using streams.
 * @param file The file object provided by Multer (from memory storage).
 * @returns A promise that resolves with the Cloudinary response or rejects with an error.
 */
export const uploadImageToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    // We ensure we have the correct type for the input 'file'
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        // Optional: set a folder or other options here
      } as UploadApiOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary image upload error:', error);
          return reject(error); // Reject the promise on error
        }
        if (result) {
          return resolve(result); // Resolve the promise with the successful result
        }
      },
    );

    // Pipe the Node.js Buffer into the upload stream
    // The .end() method accepts a Node.js Buffer seamlessly
    uploadStream.end(buffer);
  });
};
