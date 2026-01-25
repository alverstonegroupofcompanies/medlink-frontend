import { BASE_BACKEND_URL } from '@/config/api';

/**
 * Helper to ensure image URLs are complete with domain
 * @param path - The image path from the backend
 * @returns The full URL or a placeholder if path is missing
 */
export const getFullImageUrl = (path?: string | null): string => {
    if (__DEV__) {
        console.log('🖼️ [getFullImageUrl] Input path:', path);
    }

    if (!path) {
        if (__DEV__) {
            console.log('🖼️ [getFullImageUrl] No path provided, returning placeholder');
        }
        return 'https://i.pravatar.cc/150?img=12'; // Default placeholder
    }

    // Check if already a full URL
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {

        // Fix for double-wrapped URLs (e.g. https://domain/app/https://domain/...)
        // This happens if backend blindly wraps an existing URL
        const lastProtocolIndex = path.lastIndexOf('http');
        if (lastProtocolIndex > 0) {
            if (__DEV__) {
                console.log('[getFullImageUrl] ⚠️ Detected double-wrapped URL, fixing:', path);
            }
            const fixedPath = path.substring(lastProtocolIndex);
            // Recursively verify the fixed path in case it needs localhost adjustment
            return getFullImageUrl(fixedPath);
        }

        // Fix for localhost URLs on real devices
        // If the URL is localhost/127.0.0.1 but we are on a device that needs a specific IP
        if ((path.includes('localhost') || path.includes('127.0.0.1')) && BASE_BACKEND_URL) {
            try {
                const backendUrlObj = new URL(BASE_BACKEND_URL);
                const originalUrlObj = new URL(path);

                // If backend is NOT localhost, but image IS localhost, swap the host
                if (!backendUrlObj.hostname.includes('localhost') && !backendUrlObj.hostname.includes('127.0.0.1')) {
                    originalUrlObj.hostname = backendUrlObj.hostname;
                    originalUrlObj.port = backendUrlObj.port;
                    originalUrlObj.protocol = backendUrlObj.protocol;
                    const swapped = originalUrlObj.toString();
                    if (__DEV__) {
                        console.log(`Fixing localhost URL: ${path} -> ${swapped}`);
                    }
                    return getFullImageUrl(swapped);
                }
            } catch (e) {
                console.warn('Error fixing localhost URL:', e);
            }
        }

        // Normalize common path issues
        // - Our backend serves public files under /app (Hostinger-style), so map /storage → /app
        // - Collapse accidental double-underscores in filenames
        // - Fix accidental "/logoo/" directory typo if it appears
        const fixedPath = path
            .replace('/storage/', '/app/')
            .replace('/logoo/', '/logo/')
            .replace(/__+/g, '_');

        if (__DEV__) {
            console.log('🖼️ [getFullImageUrl] Already full URL:', fixedPath);
        }
        return fixedPath;
    }

    // Clean path (remove leading slash if exists)
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;
    if (__DEV__) {
        console.log('🖼️ [getFullImageUrl] Cleaned path:', cleanPath);
    }

    // Fix for missing app prefix in uploads path (common issue)
    if (cleanPath.startsWith('uploads/')) {
        cleanPath = `app/${cleanPath}`;
        if (__DEV__) {
            console.log('🖼️ [getFullImageUrl] Added app prefix:', cleanPath);
        }
    }

    // Ensure base URL ends with slash
    const baseUrl = BASE_BACKEND_URL.endsWith('/') ? BASE_BACKEND_URL : `${BASE_BACKEND_URL}/`;
    if (__DEV__) {
        console.log('🖼️ [getFullImageUrl] Base URL:', baseUrl);
    }

    const fullUrl = `${baseUrl}${cleanPath}`.replace('/logoo/', '/logo/').replace(/__+/g, '_');
    if (__DEV__) {
        console.log('🖼️ [getFullImageUrl] ✅ Final URL:', fullUrl);
    }

    // Validate URL format
    /*
    try {
        new URL(fullUrl);
        // console.log('🖼️ [getFullImageUrl] ✅ URL is valid');
    } catch (error) {
        console.error('🖼️ [getFullImageUrl] ❌ Invalid URL format:', fullUrl);
    }
    */

    return fullUrl;
};
