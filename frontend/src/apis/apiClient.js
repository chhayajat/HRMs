// Uses VITE_API_BASE_URL from environment (set in Render dashboard), falls back to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('hrms_token');
  const tenantId = localStorage.getItem('hrms_tenant_id');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['Tenant-ID'] = tenantId;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Something went wrong');
    }

    return result;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
};
