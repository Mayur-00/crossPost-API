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
  imageMimeType:z.string().optional(),
  scheduledDate:z.date().optional()
});


export const getPostSchema = z.object({
  post_id: z.string().min(5),
});
export const getSearchPostsSchema = z.object({
  query:z.string().min(2, 'Query must be atleast 2 characters long'),
  type:z.enum(['ALL', 'FAILED', 'SCHEDULED', 'UPLOADED', 'CREATED', 'DRAFT']),
  limit:z.coerce.number(),
  skip:z.coerce.number(),
});
export type getSearchPostsDTO = z.infer<typeof getSearchPostsSchema>;


export const getPostsSchema = z.object({
  limit:z.coerce.number(),
  skip:z.coerce.number(),
});

export type getPostDto = z.infer<typeof getPostSchema>;