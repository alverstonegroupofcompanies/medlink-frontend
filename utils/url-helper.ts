import { BASE_BACKEND_URL } from '@/config/api';

/**
 * Helper to ensure image URLs are complete with domain
 * @param path - The image path from the backend
 * @returns The full URL or a placeholder if path is missing
 */
export const getFullImageUrl = (path?: string | null): string => {
    console.log('🖼️ [getFullImageUrl] Input path:', path);

    if (!path) {
        console.log('🖼️ [getFullImageUrl] No path provided, returning placeholder');
        return 'https://i.pravatar.cc/150?img=12'; // Default placeholder
    }

    // Check if already a full URL
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
        console.log('🖼️ [getFullImageUrl] Already full URL:', path);
        return path;
    }

    // Clean path (remove leading slash if exists)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    console.log('🖼️ [getFullImageUrl] Cleaned path:', cleanPath);

    // Ensure base URL ends with slash
    const baseUrl = BASE_BACKEND_URL.endsWith('/') ? BASE_BACKEND_URL : `${BASE_BACKEND_URL}/`;
    console.log('🖼️ [getFullImageUrl] Base URL:', baseUrl);

    const fullUrl = `${baseUrl}${cleanPath}`;
    console.log('🖼️ [getFullImageUrl] ✅ Final URL:', fullUrl);

    // Validate URL format
    try {
        new URL(fullUrl);
        console.log('🖼️ [getFullImageUrl] ✅ URL is valid');
    } catch (error) {
        console.error('🖼️ [getFullImageUrl] ❌ Invalid URL format:', fullUrl);
    }

    return fullUrl;
};
