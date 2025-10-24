const API_BASE_URL = 'http://localhost:8000/api';

// Brand Data API
export const brandDataAPI = {
  list: async () => {
    const response = await fetch(`${API_BASE_URL}/brand-data`);
    return response.json();
  },

  get: async (filename) => {
    const response = await fetch(`${API_BASE_URL}/brand-data/${filename}`);
    return response.json();
  },

  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/brand-data/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  delete: async (filename) => {
    const response = await fetch(`${API_BASE_URL}/brand-data/${filename}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  generate: async (data) => {
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
  list: async () => {
    const response = await fetch(`${API_BASE_URL}/briefs`);
    return response.json();
  },

  get: async (filename) => {
    const response = await fetch(`${API_BASE_URL}/briefs/${filename}`);
    return response.json();
  },

  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/briefs/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  delete: async (filename) => {
    const response = await fetch(`${API_BASE_URL}/briefs/${filename}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  generate: async (data) => {
    const response = await fetch(`${API_BASE_URL}/briefs/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Drafts API
export const draftsAPI = {
  list: async () => {
    const response = await fetch(`${API_BASE_URL}/drafts`);
    return response.json();
  },

  get: async (filename) => {
    const response = await fetch(`${API_BASE_URL}/drafts/${filename}`);
    return response.json();
  },

  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/drafts/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  delete: async (filename) => {
    const response = await fetch(`${API_BASE_URL}/drafts/${filename}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  generate: async (data) => {
    const response = await fetch(`${API_BASE_URL}/drafts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Jobs API
export const jobsAPI = {
  list: async (status) => {
    const url = status ? `${API_BASE_URL}/jobs?status=${status}` : `${API_BASE_URL}/jobs`;
    const response = await fetch(url);
    return response.json();
  },

  get: async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    return response.json();
  },

  streamLogs: (jobId, onLog, onComplete, onError) => {
    const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}/logs`);

    eventSource.addEventListener('log', (event) => {
      const data = JSON.parse(event.data);
      onLog(data.message);
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      onComplete(data);
      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      onError(event);
      eventSource.close();
    });

    return eventSource;
  },
};
