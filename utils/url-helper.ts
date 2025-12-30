import { API_BASE_URL } from '@/config/api';

/**
 * Helper to ensure image URLs are complete with domain
 * @param path - The image path from the backend
 * @returns The full URL or a placeholder if path is missing
 */
export const getFullImageUrl = (path?: string | null): string => {
    if (!path) return 'https://i.pravatar.cc/150?img=12'; // Default placeholder

    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
        return path;
    }

    // Clean path (remove leading slash if exists)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Ensure base URL ends with slash
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

    return `${baseUrl}${cleanPath}`;
};
