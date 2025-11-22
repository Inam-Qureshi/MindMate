import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader
} from 'react-feather';
import { API_ENDPOINTS } from '../../config/api';
import { AuthStorage } from '../../utils/localStorage';
import apiClient from '../../utils/axiosConfig';

const DateTimeSelector = ({
  specialistId,
  availableSlots,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  consultationMode,
  onConsultationModeChange,
  duration,
  onDurationChange,
  darkMode
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available slots from API
  const fetchAvailableSlots = async (date) => {
    if (!specialistId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = AuthStorage.getToken();
      if (!token) {
        setError('Please log in to view available slots');
        return;
      }
      
      // Format date as YYYY-MM-DD
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // If specific date selected, use date-specific endpoint
      if (date) {
        const dateStr = formatDate(date);
        const slotAppointmentType = consultationMode === 'virtual' ? 'online' : (consultationMode || 'online');
        
        const response = await apiClient.get(
          API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS_DATE(specialistId),
          { 
            params: {
              date: dateStr,
              appointment_type: slotAppointmentType
            }
          }
        );
        
        // Backend returns array directly
        if (response.data && Array.isArray(response.data)) {
          setTimeSlots(response.data);
        } else if (response.data?.slots) {
          setTimeSlots(response.data.slots);
        } else {
          setTimeSlots([]);
        }
        return;
      }

      // Otherwise use date range endpoint
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6); // Next 7 days
      
      const slotAppointmentType = consultationMode === 'virtual' ? 'online' : (consultationMode || 'online');
      
      const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS(specialistId),
        { 
          params: {
            start_date: formatDate(today),
            end_date: formatDate(endDate),
            appointment_type: slotAppointmentType
          }
        }
      );
      
      // Backend returns array directly (already handled above for date-specific endpoint)
      if (response.data && Array.isArray(response.data)) {
        setTimeSlots(response.data);
      } else if (response.data?.slots && Array.isArray(response.data.slots)) {
        setTimeSlots(response.data.slots);
      } else {
        setTimeSlots([]);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, specialistId]);

  const consultationModes = [
    {
      value: 'online',
      label: 'Online Session',
      description: 'Video call from your home',
      icon: <Video size={20} />,
      features: ['Video call', 'Screen sharing', 'Recording available']
    },
    {
      value: 'in_person',
      label: 'In-Person Session',
      description: 'Face-to-face meeting',
      icon: <MapPin size={20} />,
      features: ['Physical meeting', 'Direct interaction', 'Private office']
    }
  ];

  const durationOptions = [
    { value: 30, label: '30 minutes', description: 'Quick consultation' },
    { value: 50, label: '50 minutes', description: 'Standard session' },
    { value: 60, label: '60 minutes', description: 'Extended session' },
    { value: 90, label: '90 minutes', description: 'Intensive session' }
  ];

  useEffect(() => {
    processAvailableSlots();
  }, [availableSlots]);

  useEffect(() => {
    if (selectedDate) {
      loadTimeSlotsForDate(selectedDate);
    }
  }, [selectedDate, availableSlots]);

  const processAvailableSlots = () => {
    const dates = new Set();
    availableSlots.forEach(slot => {
      const date = new Date(slot.slot_date).toDateString();
      dates.add(date);
    });
    setAvailableDates(Array.from(dates).map(date => new Date(date)));
  };

  const loadTimeSlotsForDate = (date) => {
    const dateString = date.toDateString();
    const slots = availableSlots.filter(slot => 
      new Date(slot.slot_date).toDateString() === dateString
    );
    setTimeSlots(slots);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateAvailable = (date) => {
    return availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  const isDateSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const isDateToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatTimeSlot = (slot) => {
    const startTime = new Date(slot.slot_date);
    const endTime = new Date(new Date(slot.slot_date).getTime() + (slot.duration_minutes || 60) * 60000);
    
    return {
      id: slot.slot_id,
      start: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: slot.duration_minutes || 50,
      price: slot.price,
      isBooked: slot.status !== 'available' || !slot.can_be_booked
    };
  };

  const handleDateClick = (date) => {
    if (isDateAvailable(date)) {
      onDateSelect(date);
    }
  };

  const handleTimeClick = (timeSlot) => {
    if (!timeSlot.isBooked) {
      onTimeSelect(timeSlot);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={`date-time-selector ${darkMode ? 'dark' : ''}`}>
      {/* Consultation Mode Selection */}
      <div className="consultation-mode-selection">
        <h4>Choose Consultation Mode</h4>
        <div className="mode-options">
          {consultationModes.map(mode => (
            <motion.div
              key={mode.value}
              className={`mode-option ${consultationMode === mode.value ? 'selected' : ''}`}
              onClick={() => onConsultationModeChange(mode.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="mode-icon">{mode.icon}</div>
              <div className="mode-content">
                <h5>{mode.label}</h5>
                <p>{mode.description}</p>
                <div className="mode-features">
                  {mode.features.map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                </div>
              </div>
              {consultationMode === mode.value && (
                <CheckCircle size={20} className="selected-icon" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      <div className="duration-selection">
        <h4>Session Duration</h4>
        <div className="duration-options">
          {durationOptions.map(option => (
            <button
              key={option.value}
              className={`duration-option ${duration === option.value ? 'selected' : ''}`}
              onClick={() => onDurationChange(option.value)}
            >
              <span className="duration-value">{option.value}</span>
              <span className="duration-label">{option.label}</span>
              <span className="duration-description">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-section">
        <h4>Select Date</h4>
        <div className="calendar-container">
          <div className="calendar-header">
            <button 
              className="nav-button"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <h3>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button 
              className="nav-button"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            
            <div className="calendar-days">
              {getDaysInMonth(currentMonth).map((day, index) => (
                <motion.button
                  key={index}
                  className={`calendar-day ${
                    !day ? 'empty' : ''
                  } ${
                    day && isDateAvailable(day) ? 'available' : ''
                  } ${
                    day && isDateSelected(day) ? 'selected' : ''
                  } ${
                    day && isDateToday(day) ? 'today' : ''
                  }`}
                  onClick={() => day && handleDateClick(day)}
                  disabled={!day || !isDateAvailable(day)}
                  whileHover={day && isDateAvailable(day) ? { scale: 1.1 } : {}}
                  whileTap={day && isDateAvailable(day) ? { scale: 0.9 } : {}}
                >
                  {day && day.getDate()}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="time-slots-section">
          <h4>Select Time</h4>
          <div className="time-slots-container">
            {timeSlots.length > 0 ? (
              <div className="time-slots-grid">
                {timeSlots.map(slot => {
                  const formattedSlot = formatTimeSlot(slot);
                  return (
                    <motion.button
                      key={slot.slot_id}
                      className={`time-slot ${
                        selectedTime && selectedTime.id === slot.slot_id ? 'selected' : ''
                      } ${
                        formattedSlot.isBooked ? 'booked' : ''
                      }`}
                      onClick={() => handleTimeClick(formattedSlot)}
                      disabled={formattedSlot.isBooked}
                      whileHover={!formattedSlot.isBooked ? { scale: 1.05 } : {}}
                      whileTap={!formattedSlot.isBooked ? { scale: 0.95 } : {}}
                    >
                      <div className="time-info">
                        <span className="time-range">
                          {formattedSlot.start} - {formattedSlot.end}
                        </span>
                        <span className="time-duration">
                          {formattedSlot.duration} min
                        </span>
                      </div>
                      {formattedSlot.price && (
                        <div className="time-price">
                          PKR {formattedSlot.price}
                        </div>
                      )}
                      {formattedSlot.isBooked && (
                        <div className="booked-indicator">
                          <AlertCircle size={14} />
                          Booked
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="no-slots">
                <Clock size={24} />
                <p>No available time slots for this date</p>
                <p>Please select a different date</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {(selectedDate || selectedTime) && (
        <div className="selection-summary">
          <h4>Your Selection</h4>
          <div className="summary-content">
            {selectedDate && (
              <div className="summary-item">
                <Calendar size={16} />
                <span>{selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            )}
            {selectedTime && (
              <div className="summary-item">
                <Clock size={16} />
                <span>{selectedTime.start} - {selectedTime.end}</span>
              </div>
            )}
            <div className="summary-item">
              {consultationMode === 'online' ? <Video size={16} /> : <MapPin size={16} />}
              <span>{consultationMode === 'online' ? 'Online Session' : 'In-Person Session'}</span>
            </div>
            <div className="summary-item">
              <Clock size={16} />
              <span>{duration} minutes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimeSelector;
