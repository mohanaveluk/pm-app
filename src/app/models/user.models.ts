export type UserRole = 'guest' | 'registered' | 'admin' | 'tester';
export type Gender = 'bride' | 'groom';
export type ProfileStatus = 'active' | 'inactive' | 'pending' | 'reported' | 'blocked';
export type MatchStatus = 'suggested' | 'shortlisted' | 'interested' | 'connected' | 'skipped' | 'reconsidered';
export type PhotoPrivacy = 'everyone' | 'mutual_matches' | 'premium_only' | 'on_request';
export type MembershipTier = 'free' | 'silver' | 'gold' | 'platinum';
export type FamilyType = 'joint' | 'nuclear';
export type FoodPreference = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type AttachmentType = 'image' | 'video' | 'audio' | 'document';
export type CallType = 'audio' | 'video';
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  role: any;
  role_guid: string;
  gender?: Gender;
  createdAt: Date;
  lastActive: Date;
  isVerified?: boolean;
  avatar: string;
  organizationId: string;

}

export interface Location {
  city: string;
  state: string;
  country: string;
  willingToRelocate: boolean;
}

export interface Education {
  level: string;
  field: string;
  institution?: string;
}

export interface Occupation {
  title: string;
  company?: string;
  annualIncome?: string;
  workingStatus: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface ChatAttachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'text' | 'icebreaker' | 'system' | 'attachment';
  deliveryStatus?: MessageDeliveryStatus;
  attachments?: ChatAttachment[];
  reactions?: MessageReaction[];
  deletedAt?: Date;
}

export interface CallRecord {
  id: string;
  conversationId: string;
  initiatorId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  duration?: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isUnlocked: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
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