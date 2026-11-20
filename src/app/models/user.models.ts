import { AppRole } from './role.model';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  role: AppRole;
  role_guid: string;
  createdAt: Date;
  lastActive: Date;
  isVerified?: boolean;
  avatar: string;
  organizationId: string;
  /** A vendor account (is_internal = 0 / ExternalUser): it sees only the vendor screens. */
  isExternal?: boolean;
}

export interface UserToken {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}
