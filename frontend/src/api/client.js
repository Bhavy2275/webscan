/**
 * @fileoverview Frontend API fetch client wrapper.
 * @module api/client
 */

import { supabase } from '../utils/supabase';


/**
 * Resolves the API endpoint base path dynamically.
 * Priority: LocalStorage override -> Environment variable -> Localhost fallback
 * 
 * @returns {string} Fully qualified API base URL.
 */
function getApiUrl() {
  let url = localStorage.getItem('DEBUG_API_URL') || import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // If the URL does not start with http:// or https://, prepend https:// to prevent it being treated as a relative path
  if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = 'https://' + url;
  }

  // Auto-append '/api' if the string omits it
  if (url && !url.endsWith('/api') && !url.endsWith('/api/')) {
    url = url.replace(/\/$/, '') + '/api';
  }

  return url;
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

  const activeApiUrl = getApiUrl();
  console.log(`[API CLIENT] Fetching: ${activeApiUrl}${path}`);

  const response = await fetch(`${activeApiUrl}${path}`, {
    ...options,
    headers
  });

  // Handle empty or error response bodies
  let responseData;
  try {
    responseData = await response.json();
  } catch {
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

