/**
 * @fileoverview Frontend API fetch client wrapper.
 * @module api/client
 */

import { supabase } from '../utils/supabase';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// If the URL does not start with http:// or https://, prepend https:// to prevent it being treated as a relative path
if (API_URL && !API_URL.startsWith('http://') && !API_URL.startsWith('https://') && !API_URL.startsWith('/')) {
  API_URL = 'https://' + API_URL;
}

// Auto-append '/api' if the environmental variable omits it
if (API_URL && !API_URL.endsWith('/api') && !API_URL.endsWith('/api/')) {
  API_URL = API_URL.replace(/\/$/, '') + '/api';
}

/**
 * Perform a secure fetch request to the Express backend.
 * Automatically injects the Supabase JWT.
 * 
 * @param {string} path - API endpoint path (e.g. '/upload')
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<any>} Parsed JSON response.
 */
async function request(path, options = {}) {
  // Retrieve the current session token dynamically
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Treat body as JSON unless it's FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  // Handle empty or error response bodies
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    responseData = {};
  }

  if (!response.ok) {
    const errorMessage = responseData.error || `HTTP error! Status: ${response.status}`;
    const errorDetails = responseData.details ? `: ${responseData.details}` : '';
    throw new Error(`${errorMessage}${errorDetails}`);
  }

  return responseData;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
