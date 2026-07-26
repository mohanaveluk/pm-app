import { Activity, ActivityDropdownItem } from './activity.model';

export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BulkCreateActivityResult {
  created: Activity[];
  skipped: number;
  skippedCodes: string[];
}

export type ActivityResponse = ApiEnvelope<Activity>;
export type PagedActivityResponse = ApiEnvelope<PagedResult<Activity>>;
export type ActivityListResponse = ApiEnvelope<Activity[]>;
export type ActivityDropdownListResponse = ApiEnvelope<ActivityDropdownItem[]>;
export type BulkCreateActivityResponse = ApiEnvelope<BulkCreateActivityResult>;
