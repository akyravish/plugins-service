/**
 * Auth plugin type definitions.
 */

/**
 * User payload attached to request after authentication
 */
export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * User data returned from auth operations (without sensitive fields)
 */
export interface UserData {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/**
 * Auth result with user and token
 */
export interface AuthResult {
  user: UserData;
  token: string;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

