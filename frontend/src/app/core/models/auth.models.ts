export enum UserRole {
  Customer = 1,
  SuperAdmin = 2
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: UserProfile;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
  portal?: 'admin' | 'customer';
}

export interface VerifyResetOtpDto {
  email: string;
  otp: string;
  portal?: 'admin' | 'customer';
}

export interface ResetPasswordDto {
  email: string;
  resetToken: string;
  newPassword: string;
  portal?: 'admin' | 'customer';
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  firstName: string;
  lastName: string;
  phone?: string;
}
