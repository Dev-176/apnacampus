import { signupSchema, loginSchema } from '../features/auth/types';
import { formatAuthError } from '../features/auth/api/authService';

describe('Phase 1 Auth Suite', () => {
  describe('18+ Verification & Signup Validation', () => {
    it('fails signup validation if 18+ is not confirmed', () => {
      const result = signupSchema.safeParse({
        fullName: 'Aman Verma',
        email: 'aman@college.edu',
        password: 'password123',
        confirmPassword: 'password123',
        is18Confirmed: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const has18Error = result.error.issues.some((issue) =>
          issue.message.includes('18+')
        );
        expect(has18Error).toBe(true);
      }
    });

    it('fails signup validation if passwords do not match', () => {
      const result = signupSchema.safeParse({
        fullName: 'Aman Verma',
        email: 'aman@college.edu',
        password: 'password123',
        confirmPassword: 'differentpassword',
        is18Confirmed: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Passwords do not match');
      }
    });

    it('passes signup validation when all fields are valid and 18+ is confirmed', () => {
      const result = signupSchema.safeParse({
        fullName: 'Aman Verma',
        email: 'aman@college.edu',
        password: 'password123',
        confirmPassword: 'password123',
        is18Confirmed: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Login Validation', () => {
    it('rejects invalid email formats', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('rejects short passwords under 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'aman@college.edu',
        password: '123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Friendly Error Message Formatting', () => {
    it('formats invalid login credentials gracefully', () => {
      const error = new Error('Invalid login credentials');
      expect(formatAuthError(error)).toBe(
        'Incorrect email or password. Please verify and try again.'
      );
    });

    it('formats duplicate user error gracefully', () => {
      const error = new Error('User already registered');
      expect(formatAuthError(error)).toBe(
        'An account with this email address already exists. Please log in instead.'
      );
    });

    it('formats rate limit exceeded gracefully', () => {
      const error = new Error('Email rate limit exceeded');
      expect(formatAuthError(error)).toBe(
        'Too many login attempts. Please wait a few minutes before trying again.'
      );
    });

    it('formats expired session gracefully', () => {
      const error = new Error('JWT expired');
      expect(formatAuthError(error)).toBe(
        'Your login session has expired. Please sign in again to continue.'
      );
    });
  });
});
