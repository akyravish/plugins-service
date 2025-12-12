/**
 * Auth plugin tests.
 */

import { registerSchema, loginSchema } from '../validators';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration input', () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.name).toBe('Test User');
      }
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const input = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject short name', () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'A',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should trim and lowercase email', () => {
      const input = {
        email: '  TEST@Example.COM  ',
        password: 'Password123!',
        name: 'Test User',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate a valid login input', () => {
      const input = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const input = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'not-an-email',
        password: 'password',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

