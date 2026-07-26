import { AppRole } from './role.model';

export interface PmUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  organizationId?: string;
  profileImage?: string;
}

export interface Organization {
  id: string;
  oguid: string;
  organizationCode: string;
  organizationName: string;
  legalName?: string;
  email: string;
  phoneNumber?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxNumber?: string;
  subscriptionStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  emailVerified: boolean;
  isActive: boolean;
}

export interface RegisterOrgRequest {
  organizationName: string;
  legalName?: string;
  email: string;
  phoneNumber?: string;
  website?: string;
}

export interface VerifyEmailRequest {
  email?: string;
  oguid?: string;
  otp: string;
}

export interface SubscriptionPlan {
  id: string;
  planCode: string;
  planName: string;
  description?: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  amount: number;
  maxUsers: number;
  storageLimit?: number;
  featuresJson?: Record<string, unknown>;
  isActive: boolean;
}

export interface DashboardSummary {
  organization: { id: string; name: string; code: string; status: string };
  users: { total: number; active: number; inactive: number; maxAllowed: number; utilizationPercent: number };
  subscription: { planName: string; billingCycle: string; status: string; startDate: string; endDate: string; amount: number } | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    username?: string;
  };
}
