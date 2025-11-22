/**
 * API Integration Validation
 * =========================
 * Comprehensive validation for API integration and data consistency
 */

import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';

/**
 * API Response Validator
 */
export class APIResponseValidator {
  /**
   * Validate specialist search response
   */
  static validateSpecialistResponse(response) {
    const errors = [];
    
    if (!response || typeof response !== 'object') {
      errors.push('Response must be an object');
      return { isValid: false, errors };
    }

    if (!Array.isArray(response.data)) {
      errors.push('Response data must be an array');
    }

    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((specialist, index) => {
        const specialistErrors = this.validateSpecialist(specialist, index);
        errors.push(...specialistErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual specialist object
   */
  static validateSpecialist(specialist, index = 0) {
    const errors = [];
    const prefix = `Specialist[${index}]`;

    if (!specialist.id) {
      errors.push(`${prefix}: Missing required field 'id'`);
    }

    if (!specialist.first_name) {
      errors.push(`${prefix}: Missing required field 'first_name'`);
    }

    if (!specialist.last_name) {
      errors.push(`${prefix}: Missing required field 'last_name'`);
    }

    if (specialist.consultation_fee !== undefined && typeof specialist.consultation_fee !== 'number') {
      errors.push(`${prefix}: 'consultation_fee' must be a number`);
    }

    if (specialist.average_rating !== undefined && (typeof specialist.average_rating !== 'number' || specialist.average_rating < 0 || specialist.average_rating > 5)) {
      errors.push(`${prefix}: 'average_rating' must be a number between 0 and 5`);
    }

    if (specialist.total_reviews !== undefined && (typeof specialist.total_reviews !== 'number' || specialist.total_reviews < 0)) {
      errors.push(`${prefix}: 'total_reviews' must be a non-negative number`);
    }

    if (specialist.specializations && !Array.isArray(specialist.specializations)) {
      errors.push(`${prefix}: 'specializations' must be an array`);
    }

    return errors;
  }

  /**
   * Validate appointment booking response
   */
  static validateBookingResponse(response) {
    const errors = [];
    
    if (!response || typeof response !== 'object') {
      errors.push('Response must be an object');
      return { isValid: false, errors };
    }

    if (!response.data) {
      errors.push('Response must contain data');
      return { isValid: false, errors };
    }

    const { data } = response;

    if (!data.appointment_id) {
      errors.push('Missing required field: appointment_id');
    }

    if (!data.specialist_name) {
      errors.push('Missing required field: specialist_name');
    }

    if (!data.scheduled_start) {
      errors.push('Missing required field: scheduled_start');
    }

    if (!data.appointment_type) {
      errors.push('Missing required field: appointment_type');
    }

    if (data.appointment_type && !['online', 'in_person'].includes(data.appointment_type)) {
      errors.push('appointment_type must be either "online" or "in_person"');
    }

    if (data.fee !== undefined && typeof data.fee !== 'number') {
      errors.push('fee must be a number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate time slots response
   */
  static validateSlotsResponse(response) {
    const errors = [];
    
    if (!response || typeof response !== 'object') {
      errors.push('Response must be an object');
      return { isValid: false, errors };
    }

    if (!response.data || !response.data.slots) {
      errors.push('Response must contain slots data');
      return { isValid: false, errors };
    }

    if (!Array.isArray(response.data.slots)) {
      errors.push('Slots must be an array');
    }

    if (response.data.slots && Array.isArray(response.data.slots)) {
      response.data.slots.forEach((slot, index) => {
        const slotErrors = this.validateTimeSlot(slot, index);
        errors.push(...slotErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual time slot
   */
  static validateTimeSlot(slot, index = 0) {
    const errors = [];
    const prefix = `Slot[${index}]`;

    if (!slot.slot_id) {
      errors.push(`${prefix}: Missing required field 'slot_id'`);
    }

    if (!slot.slot_date) {
      errors.push(`${prefix}: Missing required field 'slot_date'`);
    }

    if (slot.duration_minutes !== undefined && (typeof slot.duration_minutes !== 'number' || slot.duration_minutes <= 0)) {
      errors.push(`${prefix}: 'duration_minutes' must be a positive number`);
    }

    if (slot.appointment_type && !['online', 'in_person'].includes(slot.appointment_type)) {
      errors.push(`${prefix}: 'appointment_type' must be either "online" or "in_person"`);
    }

    if (slot.status && !['available', 'booked', 'unavailable'].includes(slot.status)) {
      errors.push(`${prefix}: 'status' must be one of: available, booked, unavailable`);
    }

    return errors;
  }

  /**
   * Validate appointments list response
   */
  static validateAppointmentsResponse(response) {
    const errors = [];
    
    if (!response || typeof response !== 'object') {
      errors.push('Response must be an object');
      return { isValid: false, errors };
    }

    if (!response.data || !response.data.appointments) {
      errors.push('Response must contain appointments data');
      return { isValid: false, errors };
    }

    if (!Array.isArray(response.data.appointments)) {
      errors.push('Appointments must be an array');
    }

    if (response.data.appointments && Array.isArray(response.data.appointments)) {
      response.data.appointments.forEach((appointment, index) => {
        const appointmentErrors = this.validateAppointment(appointment, index);
        errors.push(...appointmentErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual appointment
   */
  static validateAppointment(appointment, index = 0) {
    const errors = [];
    const prefix = `Appointment[${index}]`;

    if (!appointment.appointment_id) {
      errors.push(`${prefix}: Missing required field 'appointment_id'`);
    }

    if (!appointment.specialist_name) {
      errors.push(`${prefix}: Missing required field 'specialist_name'`);
    }

    if (!appointment.scheduled_start) {
      errors.push(`${prefix}: Missing required field 'scheduled_start'`);
    }

    if (!appointment.appointment_type) {
      errors.push(`${prefix}: Missing required field 'appointment_type'`);
    }

    if (appointment.appointment_type && !['online', 'in_person'].includes(appointment.appointment_type)) {
      errors.push(`${prefix}: 'appointment_type' must be either "online" or "in_person"`);
    }

    if (appointment.status && !['booked', 'completed', 'cancelled', 'no_show'].includes(appointment.status)) {
      errors.push(`${prefix}: 'status' must be one of: booked, completed, cancelled, no_show`);
    }

    if (appointment.fee !== undefined && typeof appointment.fee !== 'number') {
      errors.push(`${prefix}: 'fee' must be a number`);
    }

    return errors;
  }
}

/**
 * API Integration Tester
 */
export class APIIntegrationTester {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
    this.results = [];
  }

  /**
   * Test specialist search endpoint
   */
  async testSpecialistSearch(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.APPOINTMENTS.SPECIALISTS_SEARCH}`, {
        params: {
          query: 'psychiatry',
          city: 'Karachi',
          specialization: 'Psychiatry',
          appointment_type: 'online',
          sort_by: 'best_match',
          page: 1,
          size: 10,
          ...params
        }
      });

      const validation = APIResponseValidator.validateSpecialistResponse(response);
      
      this.results.push({
        test: 'Specialist Search',
        success: validation.isValid,
        errors: validation.errors,
        responseTime: response.headers['x-response-time'] || 'N/A',
        status: response.status
      });

      return { success: validation.isValid, errors: validation.errors, data: response.data };
    } catch (error) {
      this.results.push({
        test: 'Specialist Search',
        success: false,
        errors: [error.message],
        responseTime: 'N/A',
        status: error.response?.status || 'N/A'
      });

      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Test time slots endpoint
   */
  async testTimeSlots(specialistId = 'test-specialist-id') {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.APPOINTMENTS.AVAILABLE_SLOTS(specialistId)}`, {
        params: {
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          appointment_type: 'online',
          limit: 10
        }
      });

      const validation = APIResponseValidator.validateSlotsResponse(response);
      
      this.results.push({
        test: 'Time Slots',
        success: validation.isValid,
        errors: validation.errors,
        responseTime: response.headers['x-response-time'] || 'N/A',
        status: response.status
      });

      return { success: validation.isValid, errors: validation.errors, data: response.data };
    } catch (error) {
      this.results.push({
        test: 'Time Slots',
        success: false,
        errors: [error.message],
        responseTime: 'N/A',
        status: error.response?.status || 'N/A'
      });

      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Test appointment booking endpoint
   */
  async testAppointmentBooking() {
    try {
      const bookingData = {
        specialist_id: 'test-specialist-id',
        slot_id: 'test-slot-id',
        appointment_type: 'online',
        presenting_concern: 'Test concern',
        patient_notes: 'Test notes',
        payment_method_id: 'easypaisa',
        payment_receipt: ''
      };

      const response = await axios.post(`${this.baseURL}${API_ENDPOINTS.APPOINTMENTS.BOOK}`, bookingData);

      const validation = APIResponseValidator.validateBookingResponse(response);
      
      this.results.push({
        test: 'Appointment Booking',
        success: validation.isValid,
        errors: validation.errors,
        responseTime: response.headers['x-response-time'] || 'N/A',
        status: response.status
      });

      return { success: validation.isValid, errors: validation.errors, data: response.data };
    } catch (error) {
      this.results.push({
        test: 'Appointment Booking',
        success: false,
        errors: [error.message],
        responseTime: 'N/A',
        status: error.response?.status || 'N/A'
      });

      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Test appointments list endpoint
   */
  async testAppointmentsList() {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.APPOINTMENTS.MY_APPOINTMENTS}`);

      const validation = APIResponseValidator.validateAppointmentsResponse(response);
      
      this.results.push({
        test: 'Appointments List',
        success: validation.isValid,
        errors: validation.errors,
        responseTime: response.headers['x-response-time'] || 'N/A',
        status: response.status
      });

      return { success: validation.isValid, errors: validation.errors, data: response.data };
    } catch (error) {
      this.results.push({
        test: 'Appointments List',
        success: false,
        errors: [error.message],
        responseTime: 'N/A',
        status: error.response?.status || 'N/A'
      });

      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('Starting API Integration Tests...');
    
    await this.testSpecialistSearch();
    await this.testTimeSlots();
    await this.testAppointmentBooking();
    await this.testAppointmentsList();

    const summary = this.getTestSummary();
    console.log('API Integration Test Summary:', summary);
    
    return summary;
  }

  /**
   * Get test summary
   */
  getTestSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      results: this.results
    };
  }

  /**
   * Clear results
   */
  clearResults() {
    this.results = [];
  }
}

/**
 * Data Consistency Checker
 */
export class DataConsistencyChecker {
  /**
   * Check specialist data consistency
   */
  static checkSpecialistConsistency(specialists) {
    const issues = [];

    if (!Array.isArray(specialists)) {
      issues.push('Specialists must be an array');
      return issues;
    }

    // Check for duplicate IDs
    const ids = specialists.map(s => s.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate specialist IDs found');
    }

    // Check for missing required fields
    specialists.forEach((specialist, index) => {
      if (!specialist.id) {
        issues.push(`Specialist[${index}]: Missing ID`);
      }
      if (!specialist.first_name || !specialist.last_name) {
        issues.push(`Specialist[${index}]: Missing name fields`);
      }
    });

    // Check rating consistency
    specialists.forEach((specialist, index) => {
      if (specialist.average_rating && specialist.total_reviews === 0) {
        issues.push(`Specialist[${index}]: Has rating but no reviews`);
      }
      if (specialist.total_reviews > 0 && !specialist.average_rating) {
        issues.push(`Specialist[${index}]: Has reviews but no rating`);
      }
    });

    return issues;
  }

  /**
   * Check appointment data consistency
   */
  static checkAppointmentConsistency(appointments) {
    const issues = [];

    if (!Array.isArray(appointments)) {
      issues.push('Appointments must be an array');
      return issues;
    }

    // Check for duplicate IDs
    const ids = appointments.map(a => a.appointment_id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate appointment IDs found');
    }

    // Check date consistency
    appointments.forEach((appointment, index) => {
      if (appointment.scheduled_start) {
        const startDate = new Date(appointment.scheduled_start);
        if (isNaN(startDate.getTime())) {
          issues.push(`Appointment[${index}]: Invalid scheduled_start date`);
        }
      }

      if (appointment.scheduled_end && appointment.scheduled_start) {
        const startDate = new Date(appointment.scheduled_start);
        const endDate = new Date(appointment.scheduled_end);
        if (endDate <= startDate) {
          issues.push(`Appointment[${index}]: End time must be after start time`);
        }
      }
    });

    return issues;
  }
}

export default {
  APIResponseValidator,
  APIIntegrationTester,
  DataConsistencyChecker
};
