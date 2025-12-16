/**
 * Auth plugin business logic.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
} from '../../common/errors';
import { AUTH_CONSTANTS } from './constants';
import { RegisterInput, LoginInput } from './validators';
import { UserData, AuthResult, JwtPayload } from './types';

// Re-export types for convenience
export type { UserData, AuthResult };

/**
 * Auth service class
 */
export class AuthService {
  constructor(private db: PrismaClient) {}

  /**
   * Hash a password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_ROUNDS);
  }

  /**
   * Compare a password with a hash
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user
   */
  private generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Format user data for response (exclude sensitive fields)
   */
  private formatUser(user: { id: string; email: string; name: string; createdAt: Date }): UserData {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, name } = input;

    // Check if user already exists
    const existingUser = await this.db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new EmailAlreadyExistsError();
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await this.db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: this.formatUser(user),
      token,
    };
  }

  /**
   * Login a user
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // Find user by email
    const user = await this.db.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isValid = await this.comparePassword(password, user.password);

    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: this.formatUser(user),
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserData> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    return this.formatUser(user);
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      return decoded;
    } catch {
      throw new InvalidCredentialsError('Invalid or expired token');
    }
  }
}
