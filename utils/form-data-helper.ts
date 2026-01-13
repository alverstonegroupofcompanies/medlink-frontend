import { Platform } from 'react-native';

/**
 * Standardized file object structure for React Native FormData
 */
export interface FileData {
    uri: string;
    name?: string;
    type?: string;
}

/**
 * Helper to get the correct MIME type based on file extension
 */
export const getMimeType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Clean up file URI for specific platforms
 * - Android: Ensures 'file://' prefix is present
 * - iOS: Removes 'file://' prefix for some FormData implementations, 
 *        but strictly speaking, modern Axios/RN usually handles 'file://' correctly.
 *        However, sticking to the project's existing pattern if it was trying to fix issues.
 *        Standard React Native usually wants 'file://' on both.
 *        Let's try standardizing to 'file://' on Android and just path on iOS if needed,
 *        but standardizing to 'file://' everywhere is usually safer for modern RN versions.
 *        Wait, the existing code was REMOVING 'file://' on iOS. We will preserve that behavior if it was intentional for a specific library version.
 */
export const getPlatformUri = (uri: string): string => {
    if (!uri) return '';

    if (Platform.OS === 'android') {
        if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
            return `file://${uri}`;
        }
    } else if (Platform.OS === 'ios') {
        // Some libraries/versions prefer the raw path on iOS
        return uri.replace('file://', '');
    }
    return uri;
};

/**
 * Append a file to FormData with standardized structure
 * @param formData The FormData object to append to
 * @param key The key name for the form field
 * @param fileData The file data (uri, name, type)
 */
export const appendFileToFormData = (
    formData: FormData,
    key: string,
    fileData: FileData
): void => {
    if (!fileData || !fileData.uri) return;

    const uri = getPlatformUri(fileData.uri);
    const name = fileData.name || uri.split('/').pop() || `${key}.jpg`;
    const type = fileData.type || getMimeType(name);

    formData.append(key, {
        uri,
        name,
        type,
    } as any);

    if (__DEV__) {
        console.log(`📎 Appended File [${key}]:`, { uri, name, type });
    }
};

/**
 * Helper to log FormData contents (for debugging)
 */
export const logFormData = (formData: FormData) => {
    if (!__DEV__) return;
    console.log('📦 FormData Contents:');
    // @ts-ignore - _parts is a React Native FormData internal
    if (formData._parts) {
        // @ts-ignore
        formData._parts.forEach((part) => {
            console.log(`   ${part[0]}:`, part[1]);
        });
    }
};
