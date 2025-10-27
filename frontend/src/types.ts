// Job types
export type JobType = 'brand_data' | 'brief' | 'draft';
export type JobStatus = 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  params: Record<string, any>;
}

// File types
export interface FileInfo {
  name: string;
  created_at: number;
  size?: number;
  preview?: string;
}

// API Response types
export interface FileListResponse {
  files: FileInfo[];
}

export interface FileContentResponse {
  content: string;
}

export interface BrandDataResponse {
  [key: string]: any;
}

export interface JobResponse {
  job_id: string;
}

export interface JobDetailResponse {
  id: string;
  type: JobType;
  status: JobStatus;
}

// Form types
export interface BrandDataFormData {
  brand_name: string;
  urls: string[];
}

export interface BriefFormData {
  title: string;
  primary_keyword: string;
  secondary_keywords: string;
  brand_data: string;
}

export interface DraftFormData {
  brief_filename: string;
  brand_data_filename: string;
}
