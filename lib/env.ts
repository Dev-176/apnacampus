import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY must not be empty'),
});

const parsedEnv = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.issues
    .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.warn(
    `[ENV WARNING] Environment configuration is missing or invalid:\n${formattedErrors}\nUsing fallback development settings.`
  );
}

export const env = {
  EXPO_PUBLIC_SUPABASE_URL:
    parsedEnv.success && parsedEnv.data.EXPO_PUBLIC_SUPABASE_URL
      ? parsedEnv.data.EXPO_PUBLIC_SUPABASE_URL
      : 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY:
    parsedEnv.success && parsedEnv.data.EXPO_PUBLIC_SUPABASE_ANON_KEY
      ? parsedEnv.data.EXPO_PUBLIC_SUPABASE_ANON_KEY
      : 'placeholder-anon-key',
  isValid: parsedEnv.success,
};
