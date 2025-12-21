import z from 'zod';

export const createPostSchema = z.object({
  content: z.string().min(5).max(500),
});


export type createPostDto = z.infer<typeof createPostSchema>;

export const multerFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(),
  buffer: z.instanceof(Buffer),
});

export const publishPostToMultiplePlatfromsSchema = z.object({
  content: z.string().min(2).max(280),
  platforms: z.array(z.enum(['LINKEDIN', 'X'])),
});
export const publishPostToMultiplePlatfromsSchemaQueued = z.object({
  content: z.string().min(2).max(280),
  platforms: z.array(z.enum(['LINKEDIN', 'X'])),
  imageLink:z.string().min(5).optional(),
  imageMimeType:z.string().optional()
});


export const getPostSchema = z.object({
  post_id: z.string().min(5),
});

export type getPostDto = z.infer<typeof getPostSchema>;