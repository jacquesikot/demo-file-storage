import type { FileListResponse, BrandDataResponse, JobResponse, BatchJobResponse, BrandDataFormData, BriefFormData, DraftFormData } from './types';

// Use environment variable for API URL, with fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Brand Data API
export const brandDataAPI = {
  list: async (): Promise<FileListResponse> => {
    const response = await fetch(`${API_BASE_URL}/brand-data`);
    return response.json();
  },

  get: async (filename: string): Promise<BrandDataResponse> => {
    const response = await fetch(`${API_BASE_URL}/brand-data/${filename}`);
    return response.json();
  },

  upload: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/brand-data/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  delete: async (filename: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/brand-data/${filename}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  generate: async (data: BrandDataFormData): Promise<JobResponse> => {
    const response = await fetch(`${API_BASE_URL}/brand-data/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Briefs API
export const briefsAPI = {
  list: async (): Promise<FileListResponse> => {
    const response = await fetch(`${API_BASE_URL}/briefs`);
    return response.json();
  },

  get: async (filename: string): Promise<{ content: string }> => {
    const response = await fetch(`${API_BASE_URL}/briefs/${filename}`);
    return response.json();
  },

  upload: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/briefs/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  delete: async (filename: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/briefs/${filename}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  generate: async (data: any): Promise<JobResponse> => {
    const response = await fetch(`${API_BASE_URL}/briefs/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  generateBatch: async (briefs: BriefFormData[]): Promise<BatchJobResponse> => {
    const response = await fetch(`${API_BASE_URL}/briefs/generate/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefs }),
    });
    return response.json();
  },
};

// Drafts API
export const draftsAPI = {
  list: async (): Promise<FileListResponse> => {
    const response = await fetch(`${API_BASE_URL}/drafts`);
    return response.json();
  },

  get: async (filename: string): Promise<{ content: string }> => {
    const response = await fetch(`${API_BASE_URL}/drafts/${filename}`);
    return response.json();
  },

  upload: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/drafts/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  delete: async (filename: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/drafts/${filename}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  generate: async (data: any): Promise<JobResponse> => {
    const response = await fetch(`${API_BASE_URL}/drafts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  generateBatch: async (drafts: DraftFormData[]): Promise<BatchJobResponse> => {
    const response = await fetch(`${API_BASE_URL}/drafts/generate/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drafts }),
    });
    return response.json();
  },
};

// Jobs API
export const jobsAPI = {
  list: async (status?: string): Promise<{ jobs: any[] }> => {
    const url = status ? `${API_BASE_URL}/jobs?status=${status}` : `${API_BASE_URL}/jobs`;
    const response = await fetch(url);
    return response.json();
  },

  get: async (jobId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    return response.json();
  },

  streamLogs: (
    jobId: string,
    onLog: (message: string) => void,
    onComplete: (data: any) => void,
    onError: (error: Event) => void
  ): EventSource => {
    const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}/logs`);

    eventSource.addEventListener('log', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onLog(data.message);
    });

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onComplete(data);
      eventSource.close();
    });

    eventSource.addEventListener('error', (event: Event) => {
      onError(event);
      eventSource.close();
    });

    return eventSource;
  },
};
