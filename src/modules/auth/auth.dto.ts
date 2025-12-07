import { z } from 'zod';

export const registerUserSchema = z.object({
  name: z.string().min(3).max(20),
  email: z.email(),
  password: z.string().min(6).max(20),
});

export type registerUserDto = z.infer<typeof registerUserSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(20),
});

export type loginUserDto = z.infer<typeof loginSchema>;

export const googleLoginSchema = z.object({
  token: z.string(),
});

export type googleLoginDto = z.infer<typeof googleLoginSchema>;
