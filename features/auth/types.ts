import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid student email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name must not exceed 60 characters'),
    email: z.string().email('Please enter a valid student email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    is18Confirmed: z.literal(true, {
      errorMap: () => ({
        message: 'You must confirm you are 18+ to join ApnaCampus (per India DPDP Act)',
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const phoneOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number with +91'),
  token: z.string().length(6, 'OTP must be 6 digits').optional(),
});

export type PhoneOtpInput = z.infer<typeof phoneOtpSchema>;
