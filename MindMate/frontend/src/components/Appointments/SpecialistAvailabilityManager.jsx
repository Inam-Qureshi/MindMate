import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'react-feather';
import apiClient from '../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../config/api';
import './SpecialistAvailabilityManager.css';

const SpecialistAvailabilityManager = ({ specialistId, darkMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [weeklySchedule, setWeeklySchedule] = useState({
    monday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 },
    tuesday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 },
    wednesday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 },
    thursday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 },
    friday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 },
    saturday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 },
    sunday: { enabled: false, start_time: '09:00', end_time: '17:00', slot_length_minutes: 60 }
  });

  const [appointmentType, setAppointmentType] = useState('online');
  const [slotGeneration, setSlotGeneration] = useState({
    start_date: '',
    end_date: '',
    generating: false
  });

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const slotLengths = [15, 30, 45, 60, 90, 120];

  const handleDayToggle = (day) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
  };

  const handleTimeChange = (day, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Token is handled by apiClient automatically

      // Backend endpoint: POST /api/appointments/specialists/availability
      // Request body: SpecialistAvailabilityRequest { online_availability, in_person_availability }
      // Backend expects nested structure: { monday: { is_available, start_time, end_time, ... }, ... }
      
      // Transform weeklySchedule to match backend format
      const onlineAvailability = {};
      const inPersonAvailability = {};
      
      Object.keys(weeklySchedule).forEach(day => {
        const daySchedule = weeklySchedule[day];
        // Check both 'enabled' (frontend) and 'is_available' (backend) for compatibility
        if (daySchedule.enabled || daySchedule.is_available) {
          const scheduleData = {
            is_available: true,
            start_time: daySchedule.start_time,
            end_time: daySchedule.end_time,
            slot_length_minutes: daySchedule.slot_length_minutes || 60,
            break_between_slots_minutes: daySchedule.break_between_slots_minutes || 0
          };
          
          // Backend expects both online_availability and in_person_availability
          // We'll set the one that matches appointmentType, and keep existing for the other
          if (appointmentType === 'online' || appointmentType === 'virtual') {
            onlineAvailability[day] = scheduleData;
            // Preserve existing in_person schedule if it exists
            if (!inPersonAvailability[day] && weeklySchedule[day].in_person) {
              inPersonAvailability[day] = weeklySchedule[day].in_person;
            }
          } else {
            inPersonAvailability[day] = scheduleData;
            // Preserve existing online schedule if it exists
            if (!onlineAvailability[day] && weeklySchedule[day].online) {
              onlineAvailability[day] = weeklySchedule[day].online;
            }
          }
        }
      });
      
      // Backend expects both online_availability and in_person_availability
      // If we're only setting one type, we need to fetch existing schedules for the other type
      // For now, send what we have - backend will merge with existing templates
      const requestBody = {
        online_availability: onlineAvailability,
        in_person_availability: inPersonAvailability
      };
      
      // If no schedules for one type, send empty object (backend will handle)
      // This allows setting schedules independently
      
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.SPECIALISTS_AVAILABILITY,
        requestBody
      );

      if (response.data.success) {
        setSuccess(response.data.message || 'Availability saved successfully!');
        setTimeout(() => setSuccess(null), 5000);
        setError(null);
      }
    } catch (err) {
      console.error('Error saving availability:', err);
      setError(err.response?.data?.detail || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (!slotGeneration.start_date || !slotGeneration.end_date) {
      setError('Please select start and end dates for slot generation');
      return;
    }

    try {
      setSlotGeneration(prev => ({ ...prev, generating: true }));
      setError(null);
      setSuccess(null);

      // Token is handled by apiClient automatically

      // Backend doesn't have a separate generate-slots endpoint
      // Slots are generated automatically when fetching available slots
      // So we'll fetch slots for the date range to trigger generation
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return null;
        }
      };
      
      // Trigger slot generation by fetching available slots for the date range
      // Backend will automatically generate slots if they don't exist
      const slotAppointmentType = appointmentType === 'virtual' ? 'online' : appointmentType;
      
      const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS(specialistId),
        {
          params: {
            start_date: formatDate(slotGeneration.start_date),
            end_date: formatDate(slotGeneration.end_date),
            appointment_type: slotAppointmentType
          }
        }
      );
      
      // Slots are now generated, response contains the slots
      const generatedSlots = Array.isArray(response.data) ? response.data : [];

      if (generatedSlots.length > 0) {
        setSuccess(`Slots generated successfully! ${generatedSlots.length} slots available.`);
        setTimeout(() => setSuccess(null), 5000);
        setError(null);
      } else {
        setError('No slots were generated. Please check your availability schedule.');
      }
    } catch (err) {
      console.error('Error generating slots:', err);
      setError(err.response?.data?.detail || 'Failed to generate slots');
    } finally {
      setSlotGeneration(prev => ({ ...prev, generating: false }));
    }
  };

  // Set default dates for slot generation
  useEffect(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    setSlotGeneration(prev => ({
      ...prev,
      start_date: today.toISOString().split('T')[0],
      end_date: nextWeek.toISOString().split('T')[0]
    }));
  }, []);

  return (
    <div className={`specialist-availability-manager ${darkMode ? 'dark' : ''}`}>
      <div className="availability-header">
        <h2>Manage Availability</h2>
        <p>Set your weekly schedule and generate time slots for patients to book</p>
      </div>

      {/* Appointment Type Selection */}
      <div className="appointment-type-section">
        <h3>Appointment Type</h3>
        <div className="type-selector">
          <button
            className={`type-button ${appointmentType === 'online' ? 'active' : ''}`}
            onClick={() => setAppointmentType('online')}
          >
            <Video size={20} />
            Online Consultations
          </button>
          <button
            className={`type-button ${appointmentType === 'in_person' ? 'active' : ''}`}
            onClick={() => setAppointmentType('in_person')}
          >
            <MapPin size={20} />
            In-Person Consultations
          </button>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="weekly-schedule-section">
        <h3>Weekly Schedule</h3>
        <div className="schedule-grid">
          {days.map(day => (
            <div key={day.key} className="day-schedule">
              <div className="day-header">
                <label className="day-toggle">
                  <input
                    type="checkbox"
                    checked={weeklySchedule[day.key].enabled}
                    onChange={() => handleDayToggle(day.key)}
                  />
                  <span className="day-label">{day.label}</span>
                </label>
              </div>
              
              {weeklySchedule[day.key].enabled && (
                <div className="day-times">
                  <div className="time-inputs">
                    <div className="time-input">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={weeklySchedule[day.key].start_time}
                        onChange={(e) => handleTimeChange(day.key, 'start_time', e.target.value)}
                      />
                    </div>
                    <div className="time-input">
                      <label>End Time</label>
                      <input
                        type="time"
                        value={weeklySchedule[day.key].end_time}
                        onChange={(e) => handleTimeChange(day.key, 'end_time', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="slot-length">
                    <label>Slot Duration (minutes)</label>
                    <select
                      value={weeklySchedule[day.key].slot_length_minutes}
                      onChange={(e) => handleTimeChange(day.key, 'slot_length_minutes', parseInt(e.target.value))}
                    >
                      {slotLengths.map(length => (
                        <option key={length} value={length}>
                          {length} minutes
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slot Generation */}
      <div className="slot-generation-section">
        <h3>Generate Time Slots</h3>
        <div className="generation-controls">
          <div className="date-inputs">
            <div className="date-input">
              <label>Start Date</label>
              <input
                type="date"
                value={slotGeneration.start_date}
                onChange={(e) => setSlotGeneration(prev => ({ ...prev, start_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="date-input">
              <label>End Date</label>
              <input
                type="date"
                value={slotGeneration.end_date}
                onChange={(e) => setSlotGeneration(prev => ({ ...prev, end_date: e.target.value }))}
                min={slotGeneration.start_date}
              />
            </div>
          </div>
          
          <button
            className="generate-button"
            onClick={handleGenerateSlots}
            disabled={slotGeneration.generating || !slotGeneration.start_date || !slotGeneration.end_date}
          >
            {slotGeneration.generating ? (
              <>
                <div className="spinner" />
                Generating...
              </>
            ) : (
              <>
                <Calendar size={20} />
                Generate Slots
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="save-button"
          onClick={handleSaveAvailability}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="spinner" />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Availability
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="status-message error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="status-message success">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};

export default SpecialistAvailabilityManager;
