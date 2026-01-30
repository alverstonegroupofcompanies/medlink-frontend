/**
 * Medical Qualifications List
 * Common medical qualifications for doctors
 * Admin can add more via admin panel - this is the base list
 */

export const MEDICAL_QUALIFICATIONS = [
  'MBBS',
  'MD',
  'MS',
  'DM',
  'MCh',
  'DNB',
  'MRCP',
  'FRCS',
  'MRCS',
  'FCPS',
  'MDS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BVSc',
  'BPT',
  'BPharm',
  'MPharm',
  'MSc (Medical)',
  'PhD (Medical)',
  'Diploma in Medical',
  'PG Diploma',
  'Fellowship',
  'Other',
];

/**
 * Get qualifications list from API
 */
export const getQualifications = async (): Promise<string[]> => {
  try {
    // Import API at the top level to avoid circular dependency
    const API = require('../app/api').default;
    const response = await API.get('/qualifications');
    
    if (response.data && response.data.qualifications && Array.isArray(response.data.qualifications)) {
      if (__DEV__) {
        console.log('✅ Loaded qualifications from API:', response.data.qualifications.length, 'items');
      }
      // Merge API qualifications with default list to ensure all defaults are available
      const merged = [...new Set([...MEDICAL_QUALIFICATIONS, ...response.data.qualifications])];
      return merged;
    }
    
    if (__DEV__) {
      console.warn('⚠️ API returned invalid qualifications data, using default list');
    }
    return MEDICAL_QUALIFICATIONS;
  } catch (error: any) {
    if (__DEV__) {
      console.warn('⚠️ Failed to fetch qualifications from API, using default list');
      console.warn('Error:', error.message || error);
      if (error.response) {
        console.warn('Response status:', error.response.status);
        console.warn('Response data:', error.response.data);
      }
    }
    return MEDICAL_QUALIFICATIONS;
  }
};
