import { supabase } from '../../../lib/supabase';
import { FEATURE_FLAGS } from '../../../constants/featureFlags';
import { LoginInput, SignupInput } from '../types';

export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message).toLowerCase()
        : '';

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Incorrect email or password. Please verify and try again.';
  }
  if (message.includes('user already registered') || message.includes('user already exists')) {
    return 'An account with this email address already exists. Please log in instead.';
  }
  if (message.includes('email rate limit exceeded') || message.includes('rate limit')) {
    return 'Too many login attempts. Please wait a few minutes before trying again.';
  }
  if (message.includes('password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('invalid email') || message.includes('email address is invalid')) {
    return 'Please enter a valid student email address.';
  }
  if (message.includes('jwt expired') || message.includes('session expired') || message.includes('token expired')) {
    return 'Your login session has expired. Please sign in again to continue.';
  }
  if (message.includes('otp expired') || message.includes('token has expired')) {
    return 'The verification code has expired. Please request a new OTP.';
  }
  if (message.includes('network request failed')) {
    return 'Cannot connect to the network. Please check your internet connection.';
  }

  return error instanceof Error ? error.message : 'Authentication error. Please try again later.';
}

export const authService = {
  async signUp(input: SignupInput) {
    if (!input.is18Confirmed) {
      throw new Error('You must confirm you are 18+ to join ApnaCampus.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          is_18_confirmed: true,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(input: LoginInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'apnacampus://reset-password',
    });

    if (error) throw error;
    return data;
  },

  async sendPhoneOtp(phone: string) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP) {
      throw new Error(
        'Phone OTP is currently disabled. Please refer to docs/SETUP.md to configure an SMS provider.'
      );
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone.trim(),
    });

    if (error) throw error;
    return data;
  },

  async verifyPhoneOtp(phone: string, token: string) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP) {
      throw new Error('Phone OTP is currently disabled.');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: token.trim(),
      type: 'sms',
    });

    if (error) throw error;
    return data;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },
};
