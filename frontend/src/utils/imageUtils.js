import { BASE_URL } from '../config';

/**
 * Normalizes image URLs to ensure both local paths and external absolute URLs
 * are rendered correctly without duplication or improper prepending.
 * 
 * @param {string|any} urlData - The raw image URL data from the backend (could be a string, or a stringified array)
 * @returns {string|null} - The sanitized, absolute URL for image rendering
 */
export const getCleanImageUrl = (urlData) => {
  if (!urlData) return null;

  // 1. Handle potential stringified arrays or malformed data
  let rawString = String(urlData);
  let cleanUrl = rawString.replace(/[\[\]'"]/g, '').split(',')[0].trim();

  // 2. Check if it's already an absolute external URL
  // We check for http://, https:// or even // (protocol-relative)
  if (/^(https?:\/\/|\/\/)/i.test(cleanUrl)) {
    return cleanUrl;
  }

  // 3. It's a relative path - Prepend the Backend Base URL
  const base = BASE_URL ? BASE_URL.replace(/\/$/, '') : '';
  const path = cleanUrl.replace(/^\//, ''); // Remove leading slash if exists
  
  return `${base}/${path}`;
};
