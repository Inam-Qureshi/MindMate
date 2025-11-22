/**
 * Profile Fields Configuration
 * 
 * Centralized configuration for all specialist profile fields.
 * Used for form generation, validation, and display.
 */

export const PROFILE_FIELDS = {
  BASIC_INFO: {
    sectionLabel: 'Basic Information',
    sectionIcon: 'User',
    sectionDescription: 'Your personal and contact information',
    fields: [
      {
        name: 'first_name',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your first name',
        validation: {
          minLength: 2,
          maxLength: 50,
          pattern: /^[a-zA-Z\s'-]+$/,
        },
      },
      {
        name: 'last_name',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your last name',
        validation: {
          minLength: 2,
          maxLength: 50,
          pattern: /^[a-zA-Z\s'-]+$/,
        },
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        readOnly: true,
        placeholder: 'your.email@example.com',
        helpText: 'Email cannot be changed',
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        required: false,
        placeholder: '+92 300 1234567',
        validation: {
          pattern: /^\+?[\d\s-()]+$/,
          maxLength: 20,
        },
      },
      {
        name: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: false,
        validation: {
          max: new Date().toISOString().split('T')[0], // Cannot be in future
        },
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: false,
        optionsKey: 'genders',
        placeholder: 'Select gender',
      },
      {
        name: 'profile_image_url',
        label: 'Profile Photo',
        type: 'file',
        accept: 'image/*',
        required: false,
        helpText: 'Upload a professional photo (JPEG, PNG, max 5MB)',
      },
      {
        name: 'cnic_number',
        label: 'CNIC Number',
        type: 'text',
        required: false,
        placeholder: '12345-1234567-1',
        validation: {
          pattern: /^\d{5}-\d{7}-\d{1}$/,
        },
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: false,
        placeholder: 'e.g., Karachi, Lahore',
      },
      {
        name: 'address',
        label: 'Address',
        type: 'textarea',
        required: false,
        rows: 3,
        placeholder: 'Enter your full address',
      },
    ],
  },

  PROFESSIONAL_INFO: {
    sectionLabel: 'Professional Information',
    sectionIcon: 'Briefcase',
    sectionDescription: 'Your professional qualifications and credentials',
    fields: [
      {
        name: 'specialist_type',
        label: 'Specialist Type',
        type: 'select',
        required: false,
        optionsKey: 'specialist_types',
        placeholder: 'Select your specialist type',
      },
      {
        name: 'qualification',
        label: 'Qualification',
        type: 'text',
        required: false,
        placeholder: 'e.g., PhD in Psychology',
      },
      {
        name: 'institution',
        label: 'Institution',
        type: 'text',
        required: false,
        placeholder: 'Name of your educational institution',
      },
      {
        name: 'years_experience',
        label: 'Years of Experience',
        type: 'number',
        required: false,
        placeholder: '0',
        validation: {
          min: 0,
          max: 50,
        },
      },
      {
        name: 'current_affiliation',
        label: 'Current Affiliation',
        type: 'text',
        required: false,
        placeholder: 'Current hospital, clinic, or organization',
      },
      {
        name: 'license_number',
        label: 'License Number',
        type: 'text',
        required: false,
        placeholder: 'Your professional license number',
      },
      {
        name: 'license_authority',
        label: 'License Authority',
        type: 'text',
        required: false,
        placeholder: 'Issuing authority name',
      },
      {
        name: 'license_expiry_date',
        label: 'License Expiry Date',
        type: 'date',
        required: false,
      },
      {
        name: 'bio',
        label: 'Bio',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Tell patients about yourself, your approach, and expertise...',
        helpText: 'A brief introduction about yourself',
      },
      {
        name: 'experience_summary',
        label: 'Experience Summary',
        type: 'textarea',
        required: false,
        rows: 6,
        placeholder: 'Detailed summary of your professional experience...',
      },
    ],
  },

  PRACTICE_DETAILS: {
    sectionLabel: 'Practice Details',
    sectionIcon: 'Calendar',
    sectionDescription: 'Your consultation settings and availability',
    fields: [
      {
        name: 'consultation_fee',
        label: 'Consultation Fee',
        type: 'number',
        required: false,
        placeholder: '0',
        validation: {
          min: 0,
        },
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'select',
        required: false,
        optionsKey: 'currencies',
        placeholder: 'Select currency',
      },
      {
        name: 'consultation_modes',
        label: 'Consultation Modes',
        type: 'multiselect',
        required: false,
        optionsKey: 'consultation_modes',
        placeholder: 'Select consultation modes',
        helpText: 'Select all modes you offer',
      },
      {
        name: 'availability_status',
        label: 'Availability Status',
        type: 'select',
        required: false,
        options: [
          { value: 'available', label: 'Available' },
          { value: 'busy', label: 'Busy' },
          { value: 'unavailable', label: 'Unavailable' },
        ],
      },
      {
        name: 'accepting_new_patients',
        label: 'Accepting New Patients',
        type: 'checkbox',
        required: false,
      },
      {
        name: 'languages_spoken',
        label: 'Languages Spoken',
        type: 'tags',
        required: false,
        placeholder: 'Add languages (press Enter)',
        helpText: 'Add languages you can communicate in',
      },
      {
        name: 'availability_schedule',
        label: 'Availability Schedule',
        type: 'schedule',
        required: false,
        helpText: 'Set your weekly availability schedule',
      },
    ],
  },

  SPECIALIZATIONS: {
    sectionLabel: 'Specializations & Therapy Methods',
    sectionIcon: 'Award',
    sectionDescription: 'Your areas of expertise and therapeutic approaches',
    fields: [
      {
        name: 'specialties_in_mental_health',
        label: 'Mental Health Specialties',
        type: 'multiselect',
        required: false,
        optionsKey: 'mental_health_specialties',
        placeholder: 'Select your specialties',
        helpText: 'Select all areas you specialize in',
      },
      {
        name: 'therapy_methods',
        label: 'Therapy Methods',
        type: 'multiselect',
        required: false,
        optionsKey: 'therapy_methods',
        placeholder: 'Select therapy methods',
        helpText: 'Select all therapeutic approaches you use',
      },
    ],
  },

  EDUCATION: {
    sectionLabel: 'Education',
    sectionIcon: 'GraduationCap',
    sectionDescription: 'Your educational background',
    fields: [
      {
        name: 'education_records',
        label: 'Education Records',
        type: 'array',
        itemType: 'education',
        required: false,
        helpText: 'Add your educational qualifications',
      },
    ],
  },

  CERTIFICATIONS: {
    sectionLabel: 'Certifications',
    sectionIcon: 'Award',
    sectionDescription: 'Your professional certifications',
    fields: [
      {
        name: 'certification_records',
        label: 'Certification Records',
        type: 'array',
        itemType: 'certification',
        required: false,
        helpText: 'Add your professional certifications',
      },
    ],
  },

  EXPERIENCE: {
    sectionLabel: 'Professional Experience',
    sectionIcon: 'Briefcase',
    sectionDescription: 'Your work experience and career history',
    fields: [
      {
        name: 'experience_records',
        label: 'Experience Records',
        type: 'array',
        itemType: 'experience',
        required: false,
        helpText: 'Add your professional experience',
      },
    ],
  },

  PROFESSIONAL_STATEMENT: {
    sectionLabel: 'Professional Statement',
    sectionIcon: 'FileText',
    sectionDescription: 'Detailed information about your practice and approach',
    fields: [
      {
        name: 'professional_statement_intro',
        label: 'Introduction',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Introduce yourself to potential patients...',
      },
      {
        name: 'professional_statement_role',
        label: 'Role of Psychologists',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Explain the role of psychologists in mental health...',
      },
      {
        name: 'professional_statement_qualifications',
        label: 'Qualifications Detail',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Detail your qualifications and credentials...',
      },
      {
        name: 'professional_statement_experience',
        label: 'Experience Detail',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Describe your professional experience...',
      },
      {
        name: 'professional_statement_patient_satisfaction',
        label: 'Patient Satisfaction & Team',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Information about patient satisfaction and your team...',
      },
      {
        name: 'professional_statement_appointment_details',
        label: 'Appointment Details',
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'How to book appointments and what to expect...',
      },
      {
        name: 'professional_statement_clinic_address',
        label: 'Clinic Address',
        type: 'textarea',
        required: false,
        rows: 3,
        placeholder: 'Your clinic location and address...',
      },
      {
        name: 'professional_statement_fee_details',
        label: 'Fee Details',
        type: 'textarea',
        required: false,
        rows: 3,
        placeholder: 'Detailed information about consultation fees...',
      },
    ],
  },

  INTERESTS: {
    sectionLabel: 'Interests',
    sectionIcon: 'Heart',
    sectionDescription: 'Your professional and personal interests',
    fields: [
      {
        name: 'interests',
        label: 'Interests',
        type: 'tags',
        required: false,
        placeholder: 'Add interests (press Enter)',
        helpText: 'Add topics or areas you\'re passionate about',
      },
    ],
  },
};

/**
 * Field definitions for array items (education, certifications, experience)
 */
export const ARRAY_ITEM_FIELDS = {
  education: [
    { name: 'degree', label: 'Degree', type: 'text', required: true },
    { name: 'field_of_study', label: 'Field of Study', type: 'text', required: false },
    { name: 'institution', label: 'Institution', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: false, validation: { min: 1900, max: new Date().getFullYear() } },
    { name: 'gpa', label: 'GPA', type: 'number', required: false, validation: { min: 0, max: 4.0 } },
    { name: 'description', label: 'Description', type: 'textarea', required: false, rows: 3 },
  ],
  certification: [
    { name: 'name', label: 'Certification Name', type: 'text', required: true },
    { name: 'issuing_body', label: 'Issuing Body', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: false, validation: { min: 1900, max: new Date().getFullYear() } },
    { name: 'expiry_date', label: 'Expiry Date', type: 'date', required: false },
    { name: 'credential_id', label: 'Credential ID', type: 'text', required: false },
    { name: 'description', label: 'Description', type: 'textarea', required: false, rows: 3 },
  ],
  experience: [
    { name: 'title', label: 'Job Title', type: 'text', required: true },
    { name: 'company', label: 'Company/Organization', type: 'text', required: true },
    { name: 'years', label: 'Years', type: 'number', required: false, validation: { min: 0 } },
    { name: 'start_date', label: 'Start Date', type: 'date', required: false },
    { name: 'end_date', label: 'End Date', type: 'date', required: false },
    { name: 'is_current', label: 'Current Position', type: 'checkbox', required: false },
    { name: 'description', label: 'Description', type: 'textarea', required: false, rows: 4 },
  ],
};

/**
 * Validation rules for all fields
 */
export const VALIDATION_RULES = {
  first_name: { required: true, minLength: 2, maxLength: 50 },
  last_name: { required: true, minLength: 2, maxLength: 50 },
  email: { required: true, type: 'email' },
  phone: { pattern: /^\+?[\d\s-()]+$/, maxLength: 20 },
  consultation_fee: { type: 'number', min: 0 },
  years_experience: { type: 'number', min: 0, max: 50 },
  cnic_number: { pattern: /^\d{5}-\d{7}-\d{1}$/ },
};

/**
 * Section display order
 */
export const SECTION_ORDER = [
  'BASIC_INFO',
  'PROFESSIONAL_INFO',
  'PRACTICE_DETAILS',
  'SPECIALIZATIONS',
  'EDUCATION',
  'CERTIFICATIONS',
  'EXPERIENCE',
  'PROFESSIONAL_STATEMENT',
  'INTERESTS',
];

/**
 * Helper function to get field configuration
 */
export const getFieldConfig = (sectionKey, fieldName) => {
  const section = PROFILE_FIELDS[sectionKey];
  if (!section) return null;
  return section.fields.find(f => f.name === fieldName);
};

/**
 * Helper function to get section configuration
 */
export const getSectionConfig = (sectionKey) => {
  return PROFILE_FIELDS[sectionKey] || null;
};

/**
 * Helper function to get all fields for a section
 */
export const getSectionFields = (sectionKey) => {
  const section = PROFILE_FIELDS[sectionKey];
  return section ? section.fields : [];
};

