export interface Lead {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  website: string;
  rating: number | string;
  reviewCount: number | string;
  category: string;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string; // From grounding metadata
  socialProfiles?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

export interface SearchParams {
  keyword: string;
  city: string;
  limit: number;
}

export interface SearchHistoryItem extends SearchParams {
  id: string;
  timestamp: number;
  resultsCount: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type ViewMode = 'search' | 'campaign';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  lastModified: number;
}