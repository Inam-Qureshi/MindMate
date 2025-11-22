/**
 * API Response Type Definitions
 * =============================
 * TypeScript-style interfaces for all API responses
 * Used for better type safety and documentation
 */

// Specialist related types
export const Specialist = {
  id: 'string',
  first_name: 'string',
  last_name: 'string',
  full_name: 'string',
  specializations: 'array', // Array of strings
  city: 'string',
  consultation_fee: 'number',
  average_rating: 'number',
  total_reviews: 'number',
  profile_image_url: 'string', // Optional
  clinic_name: 'string', // Optional
  clinic_address: 'string', // Optional
  consultation_modes: 'array', // Array of strings
  is_available: 'boolean'
};

// Time slot related types
export const TimeSlot = {
  slot_id: 'string',
  slot_date: 'string', // ISO date string
  duration_minutes: 'number',
  appointment_type: 'string', // 'online' | 'in_person'
  status: 'string', // 'available' | 'booked' | 'expired' | 'cancelled'
  can_be_booked: 'boolean'
};

// Appointment related types
export const Appointment = {
  appointment_id: 'string',
  specialist_id: 'string',
  specialist_name: 'string',
  scheduled_start: 'string', // ISO date string
  scheduled_end: 'string', // ISO date string
  appointment_type: 'string', // 'online' | 'in_person'
  status: 'string',
  fee: 'number',
  payment_status: 'string',
  presenting_concern: 'string', // Optional
  request_message: 'string', // Optional
  meeting_link: 'string', // Optional
  created_at: 'string', // ISO date string
  updated_at: 'string' // ISO date string
};

// API Response wrappers
export const APIResponse = {
  success: 'boolean',
  data: 'object', // The actual data
  error: 'string', // Optional error message
  message: 'string' // Optional success message
};

// Search and pagination types
export const SearchParams = {
  query: 'string', // Optional search query
  specialization: 'string', // Optional specialization filter
  city: 'string', // Optional city filter
  appointment_type: 'string', // Optional appointment type filter
  sort_by: 'string', // Sort criteria
  page: 'number', // Page number
  size: 'number' // Results per page
};

// Booking request types
export const BookingRequest = {
  specialist_id: 'string',
  slot_id: 'string',
  appointment_type: 'string', // 'online' | 'in_person'
  presenting_concern: 'string',
  patient_notes: 'string',
  payment_method_id: 'string',
  payment_receipt: 'string'
};

// Error response types
export const ErrorResponse = {
  detail: 'string',
  status_code: 'number',
  timestamp: 'string'
};

// Validation helper functions
export const validateSpecialist = (specialist) => {
  const required = ['id', 'first_name', 'last_name', 'full_name', 'consultation_fee'];
  return required.every(field => specialist && specialist[field] !== undefined);
};

export const validateTimeSlot = (slot) => {
  const required = ['slot_id', 'slot_date', 'duration_minutes', 'appointment_type', 'status'];
  return required.every(field => slot && slot[field] !== undefined);
};

export const validateAppointment = (appointment) => {
  const required = ['appointment_id', 'specialist_id', 'specialist_name', 'scheduled_start', 'scheduled_end', 'appointment_type', 'status', 'fee'];
  return required.every(field => appointment && appointment[field] !== undefined);
};

// Field mapping utilities
export const mapSpecialistFields = (apiSpecialist) => {
  // Handle specializations from different API endpoints
  let specializations = [];
  if (apiSpecialist.specializations && Array.isArray(apiSpecialist.specializations)) {
    specializations = apiSpecialist.specializations.map(spec => {
      if (typeof spec === 'string') {
        return spec;
      } else if (spec && typeof spec === 'object') {
        // Handle format from /api/specialists/search endpoint
        return spec.specialization || spec.value || spec.label || '';
      }
      return '';
    }).filter(Boolean);
  } else if (apiSpecialist.specialization) {
    // Handle single specialization string
    specializations = [apiSpecialist.specialization];
  }
  
  return {
    id: apiSpecialist.id,
    first_name: apiSpecialist.first_name || '',
    last_name: apiSpecialist.last_name || '',
    full_name: apiSpecialist.full_name || `${apiSpecialist.first_name || ''} ${apiSpecialist.last_name || ''}`.trim() || 'Unknown Specialist',
    specializations: specializations,
    city: apiSpecialist.city || '',
    consultation_fee: apiSpecialist.consultation_fee || 0,
    average_rating: apiSpecialist.average_rating || apiSpecialist.rating || 0,
    total_reviews: apiSpecialist.total_reviews || apiSpecialist.reviews_count || 0,
    profile_image_url: apiSpecialist.profile_image_url || apiSpecialist.profile_picture || '',
    clinic_name: apiSpecialist.clinic_name || '',
    clinic_address: apiSpecialist.clinic_address || '',
    consultation_modes: apiSpecialist.consultation_modes || apiSpecialist.availability_slots || ['online', 'in_person'],
    is_available: apiSpecialist.has_appointments_available !== false,
    experience_years: apiSpecialist.years_experience || apiSpecialist.experience_years || 0,
    years_experience: apiSpecialist.years_experience || apiSpecialist.experience_years || 0,
    specialist_type: apiSpecialist.specialist_type || 'Mental Health Specialist',
    bio: apiSpecialist.bio || '',
    languages_spoken: apiSpecialist.languages_spoken || [],
    website_url: apiSpecialist.website_url || '',
    phone: apiSpecialist.phone || ''
  };
};

export const mapTimeSlotFields = (apiSlot) => {
  if (!apiSlot) return null;
  
  // Backend returns: slot_id, specialist_id, slot_date, start_time, end_time, 
  // appointment_type, duration_minutes, is_available, can_be_booked
  return {
    slot_id: apiSlot.slot_id || apiSlot.id,
    specialist_id: apiSlot.specialist_id,
    slot_date: apiSlot.slot_date || apiSlot.start_time, // Backend uses slot_date and start_time
    start_time: apiSlot.start_time || apiSlot.slot_date, // Both represent the same datetime
    end_time: apiSlot.end_time || (apiSlot.slot_date && apiSlot.duration_minutes 
      ? new Date(new Date(apiSlot.slot_date).getTime() + (apiSlot.duration_minutes * 60000)).toISOString()
      : null),
    duration_minutes: apiSlot.duration_minutes || 60,
    appointment_type: apiSlot.appointment_type, // Backend returns "online" or "in_person" for slots
    status: apiSlot.status || 'available',
    can_be_booked: apiSlot.can_be_booked !== false && apiSlot.is_available !== false,
    is_available: apiSlot.is_available !== false && apiSlot.can_be_booked !== false
  };
};

export const mapAppointmentFields = (apiAppointment) => {
  if (!apiAppointment) return null;
  
  // Normalize appointment_type: backend uses "virtual" or "in_person", frontend uses "online" or "in_person"
  let appointmentType = apiAppointment.appointment_type;
  if (appointmentType === 'virtual') {
    appointmentType = 'online';
  }
  
  // Normalize status: ensure it's lowercase and valid
  let status = apiAppointment.status;
  if (typeof status === 'string') {
    status = status.toLowerCase();
  }
  
  return {
    appointment_id: apiAppointment.id || apiAppointment.appointment_id,
    id: apiAppointment.id || apiAppointment.appointment_id, // Include both for compatibility
    specialist_id: apiAppointment.specialist_id,
    specialist_name: apiAppointment.specialist_name || 'Unknown Specialist',
    patient_id: apiAppointment.patient_id,
    scheduled_start: apiAppointment.scheduled_start,
    scheduled_end: apiAppointment.scheduled_end,
    appointment_type: appointmentType,
    status: status,
    fee: apiAppointment.fee || 0,
    payment_status: apiAppointment.payment_status || 'unpaid',
    payment_method_id: apiAppointment.payment_method_id || null,
    payment_receipt: apiAppointment.payment_receipt || null,
    presenting_concern: apiAppointment.presenting_concern || '',
    request_message: apiAppointment.request_message || '',
    meeting_link: apiAppointment.meeting_link || '',
    patient_rating: apiAppointment.patient_rating || null, // Rating if review exists
    patient_review: apiAppointment.patient_review || null, // Review text if review exists
    review_submitted_at: apiAppointment.review_submitted_at || null, // When review was submitted
    created_at: apiAppointment.created_at,
    updated_at: apiAppointment.updated_at
  };
};
