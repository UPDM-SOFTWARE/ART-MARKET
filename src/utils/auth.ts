// Authentication utilities for managing JWT tokens and session data

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
  whatsapp?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  personal_web?: string;
}

/**
 * Checks if a JWT token has expired by decoding its payload.
 */
export const isJwtExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return true; // Expired
    }
    return false;
  } catch {
    return true; // Malformed or unparseable token
  }
};

/**
 * Completely clears authentication tokens and user data from storage.
 */
export const clearAuthData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

/**
 * Retrieves the current valid token, checking both localStorage and sessionStorage.
 * If expired or invalid, clears storage and returns null.
 */
export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return null;
  }

  if (isJwtExpired(token)) {
    clearAuthData();
    return null;
  }

  return token;
};

/**
 * Retrieves the current authenticated user data.
 */
export const getAuthUser = (): AuthUser | null => {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!userData) {
    return null;
  }

  try {
    return JSON.parse(userData);
  } catch {
    clearAuthData();
    return null;
  }
};

/**
 * Saves authentication data to storage.
 */
export const saveAuthData = (token: string, user: AuthUser, keepLoggedIn: boolean): void => {
  clearAuthData();
  const storage = keepLoggedIn ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(user));
};

/**
 * Notifies the application that the user's session has expired or is unauthorized.
 */
export const notifySessionExpired = (): void => {
  clearAuthData();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
};
