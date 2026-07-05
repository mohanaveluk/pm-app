export interface ContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  message: string;
}

export interface ContactResponse {
  id?: number;
  createdAt?: string;
  message?: string;
}

export interface ContactInfo {
  icon: string;
  title: string;
  value: string;
  description: string;
  href?: string;
  color: string;
  bg: string;
}

export interface SocialLink {
  icon: string;
  label: string;
  url: string;
  color: string;
}
