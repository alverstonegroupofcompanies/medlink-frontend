/**
 * Calculate profile completion percentage based on all doctor fields
 * Includes: Basic details, Professional details, and Documents
 */
export const calculateProfileCompletion = (doctor: any): number => {
  if (!doctor) return 0;

  // Basic Details (5 fields - 40% weight)
  const basicFields = [
    'name',
    'email',
    'phone_number',
    'current_location',
    'profile_photo',
  ];
  const basicWeight = 0.4;

  // Professional Details (8 fields - 50% weight)
  const professionalFields = [
    'professional_achievements',
    'medical_council_reg_no',
    'qualifications',
    'specialization',
    'experience',
    'current_hospital',
    'preferred_work_type',
    'preferred_location',
  ];
  const professionalWeight = 0.5;

  // Documents (3 fields - 10% weight)
  const documentFields = [
    'degree_certificate',
    'id_proof',
    'medical_registration_certificate',
  ];
  const documentWeight = 0.1;

  // Count filled fields in each category
  const countFilled = (fields: string[]) => {
    return fields.filter((field) => {
      const value = doctor[field];
      return value !== null && value !== undefined && String(value).trim() !== '';
    }).length;
  };

  const basicFilled = countFilled(basicFields);
  const professionalFilled = countFilled(professionalFields);
  const documentFilled = countFilled(documentFields);

  // Calculate completion for each category
  const basicCompletion = (basicFilled / basicFields.length) * basicWeight;
  const professionalCompletion = (professionalFilled / professionalFields.length) * professionalWeight;
  const documentCompletion = (documentFilled / documentFields.length) * documentWeight;

  // Total completion percentage
  const totalCompletion = basicCompletion + professionalCompletion + documentCompletion;

  // Ensure it's between 0 and 1
  return Math.max(0, Math.min(1, totalCompletion));
};

/**
 * Get profile completion details
 */
export const getProfileCompletionDetails = (doctor: any) => {
  if (!doctor) {
    return {
      percentage: 0,
      basicFilled: 0,
      basicTotal: 5,
      professionalFilled: 0,
      professionalTotal: 8,
      documentFilled: 0,
      documentTotal: 3,
    };
  }

  const basicFields = ['name', 'email', 'phone_number', 'current_location', 'profile_photo'];
  const professionalFields = [
    'professional_achievements',
    'medical_council_reg_no',
    'qualifications',
    'specialization',
    'experience',
    'current_hospital',
    'preferred_work_type',
    'preferred_location',
  ];
  const documentFields = ['degree_certificate', 'id_proof', 'medical_registration_certificate'];

  const countFilled = (fields: string[]) => {
    return fields.filter((field) => {
      const value = doctor[field];
      return value !== null && value !== undefined && String(value).trim() !== '';
    }).length;
  };

  return {
    percentage: calculateProfileCompletion(doctor),
    basicFilled: countFilled(basicFields),
    basicTotal: basicFields.length,
    professionalFilled: countFilled(professionalFields),
    professionalTotal: professionalFields.length,
    documentFilled: countFilled(documentFields),
    documentTotal: documentFields.length,
  };
};



