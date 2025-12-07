import { platform } from "os";
import z from "zod";


export const XCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  state: z.string().min(1, 'State parameter required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type XCallbackSchemaDto = z.infer<typeof XCallbackSchema>;

export const XPublishPostSchema = z.object({
  post_id:z.string().min(1).max(280),
});

export type XPublishPostDto = z.infer<typeof XPublishPostSchema>;

export interface TweetResponse {
  data: {
    id: string;
    text: string;
    author_id: string;
    created_at: string;
  };
};

export interface TweetDbRecord {
  ownerId:string;
  postId:string;
  xAccountId:string;
  tweetId:string
  
}