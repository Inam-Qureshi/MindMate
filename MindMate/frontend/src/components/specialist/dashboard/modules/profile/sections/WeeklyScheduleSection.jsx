import React, { useMemo } from 'react';
import { Calendar, Clock, Video, MapPin, AlertCircle } from 'react-feather';
import { motion } from 'framer-motion';

const WeeklyScheduleSection = ({ darkMode, data }) => {
  // Parse and normalize the schedule data
  const scheduleData = useMemo(() => {
    // Use availability_schedule (primary) or weekly_schedule (backward compatibility)
    let availabilitySchedule = data?.availability_schedule || data?.weekly_schedule;
    
    // Handle string format (JSON string)
    if (typeof availabilitySchedule === 'string') {
      try {
        availabilitySchedule = JSON.parse(availabilitySchedule);
      } catch (e) {
        console.warn('Failed to parse availability_schedule as JSON:', e);
        return { isNewFormat: false, onlineSchedule: null, inPersonSchedule: null, availabilitySchedule: null };
      }
    }
    
    // Handle null or undefined
    if (!availabilitySchedule || typeof availabilitySchedule !== 'object') {
      return { isNewFormat: false, onlineSchedule: null, inPersonSchedule: null, availabilitySchedule: null };
    }
    
    // Check if it's new format (nested with online/in_person) or old format (flat)
    const hasOnline = availabilitySchedule.online && typeof availabilitySchedule.online === 'object';
    const hasInPerson = availabilitySchedule.in_person && typeof availabilitySchedule.in_person === 'object';
    const isNewFormat = hasOnline || hasInPerson;
    
    if (isNewFormat) {
      return {
        isNewFormat: true,
        onlineSchedule: availabilitySchedule.online || null,
        inPersonSchedule: availabilitySchedule.in_person || null,
        availabilitySchedule: availabilitySchedule
      };
    } else {
      // Old format - flat structure
      // Check if it has day keys (monday, tuesday, etc.)
      const hasDayKeys = Object.keys(availabilitySchedule).some(key => 
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(key.toLowerCase())
      );
      
      if (hasDayKeys) {
        return {
          isNewFormat: false,
          onlineSchedule: availabilitySchedule,
          inPersonSchedule: availabilitySchedule,
          availabilitySchedule: availabilitySchedule
        };
      } else {
        // Invalid or empty schedule
        return { isNewFormat: false, onlineSchedule: null, inPersonSchedule: null, availabilitySchedule: null };
      }
    }
  }, [data?.availability_schedule, data?.weekly_schedule]);

  const { isNewFormat, onlineSchedule, inPersonSchedule, availabilitySchedule } = scheduleData;

  const daysOfWeek = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
  ];

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Handle both "HH:MM" and "HH:MM:SS" formats
    if (typeof timeString === 'string') {
      return timeString.substring(0, 5);
    }
    return String(timeString).substring(0, 5);
  };

  const getAvailableDaysCount = (schedule) => {
    if (!schedule || typeof schedule !== 'object') return 0;
    
    let count = 0;
    daysOfWeek.forEach(day => {
      // Try multiple key formats
      const dayData = schedule[day.key] || 
                      schedule[day.key.toUpperCase()] || 
                      schedule[day.key.toLowerCase()] ||
                      schedule[day.label.toLowerCase()] ||
                      schedule[day.short.toLowerCase()] ||
                      schedule[day.short.toUpperCase()];
      
      if (dayData && typeof dayData === 'object' && dayData !== null) {
        const isAvailable = dayData.is_available !== false && dayData.is_available !== null;
        const hasStartTime = dayData.start_time || dayData.startTime;
        const hasEndTime = dayData.end_time || dayData.endTime;
        
        if (isAvailable && hasStartTime && hasEndTime) {
          count++;
        }
      }
    });
    
    return count;
  };

  const renderScheduleDay = (day, schedule) => {
    if (!schedule || typeof schedule !== 'object') return null;
    
    // Try multiple key formats
    const dayData = schedule[day.key] || 
                    schedule[day.key.toUpperCase()] || 
                    schedule[day.key.toLowerCase()] ||
                    schedule[day.label.toLowerCase()] ||
                    schedule[day.short.toLowerCase()] ||
                    schedule[day.short.toUpperCase()];
    
    if (!dayData || typeof dayData !== 'object' || dayData === null) {
      return (
        <motion.div
          key={day.key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-xl border-2 ${
            darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {day.short}
              </p>
            </div>
          </div>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Not Available
          </p>
        </motion.div>
      );
    }

    // Extract day information with multiple fallbacks
    const isAvailable = dayData.is_available !== false && dayData.is_available !== null && dayData.is_available !== undefined;
    const startTime = dayData.start_time || dayData.startTime || null;
    const endTime = dayData.end_time || dayData.endTime || null;
    const slotDuration = dayData.slot_duration_minutes || dayData.slotDurationMinutes || dayData.slot_duration || 30;

    if (!isAvailable || !startTime || !endTime) {
      return (
        <motion.div
          key={day.key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-xl border-2 ${
            darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {day.short}
              </p>
            </div>
          </div>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Not Available
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={day.key}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 rounded-xl border-2 transition-all ${
          darkMode
            ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-600 shadow-lg shadow-emerald-900/20'
            : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-400 shadow-md shadow-emerald-100'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {day.short}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          {startTime && endTime && (
            <div className={`flex items-center space-x-2 p-2 rounded-lg ${
              darkMode ? 'bg-gray-900/50' : 'bg-white'
            }`}>
              <Clock className={`h-4 w-4 ${
                darkMode ? 'text-emerald-400' : 'text-emerald-600'
              }`} />
              <div className="flex-1">
                <p className={`text-xs font-medium ${
                  darkMode ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  {formatTime(startTime)} - {formatTime(endTime)}
                </p>
                <p className={`text-xs mt-0.5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {calculateDuration(startTime, endTime)}
                </p>
              </div>
            </div>
          )}
          
          {slotDuration && (
            <div className={`text-xs px-2 py-1 rounded ${
              darkMode ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <span className="font-medium">Slot:</span> {slotDuration} min
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    try {
      const startStr = String(startTime);
      const endStr = String(endTime);
      const [startHour, startMin] = startStr.split(':').map(Number);
      const [endHour, endMin] = endStr.split(':').map(Number);
      
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        return '';
      }
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const durationMinutes = endMinutes - startMinutes;
      
      if (durationMinutes <= 0) return '';
      
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}m`;
      }
    } catch (e) {
      return '';
    }
  };

  const hasOnlineSchedule = onlineSchedule && getAvailableDaysCount(onlineSchedule) > 0;
  const hasInPersonSchedule = inPersonSchedule && getAvailableDaysCount(inPersonSchedule) > 0;
  const hasOldFormatSchedule = !isNewFormat && availabilitySchedule && getAvailableDaysCount(availabilitySchedule) > 0;
  const hasAnySchedule = hasOnlineSchedule || hasInPersonSchedule || hasOldFormatSchedule;

  // Get total available days count for display
  const getTotalAvailableDays = () => {
    if (isNewFormat) {
      const onlineCount = onlineSchedule ? getAvailableDaysCount(onlineSchedule) : 0;
      const inPersonCount = inPersonSchedule ? getAvailableDaysCount(inPersonSchedule) : 0;
      return Math.max(onlineCount, inPersonCount);
    } else {
      return availabilitySchedule ? getAvailableDaysCount(availabilitySchedule) : 0;
    }
  };

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-bold flex items-center space-x-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Calendar className="h-5 w-5" />
          <span>Weekly Schedule</span>
        </h2>
        {hasAnySchedule && (
          <div className={`text-xs px-3 py-1 rounded-full ${
            darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {getTotalAvailableDays()} days available
          </div>
        )}
      </div>

      {!hasAnySchedule ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <p className="text-sm font-medium mb-2">No schedule set</p>
          <p className="text-xs">Please set your availability in the Practice Details section.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Online Schedule */}
          {isNewFormat && onlineSchedule && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Video className={`h-5 w-5 ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Online Appointments
                </h3>
                {getAvailableDaysCount(onlineSchedule) > 0 && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {getAvailableDaysCount(onlineSchedule)} days
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {daysOfWeek.map((day) => renderScheduleDay(day, onlineSchedule))}
              </div>
            </div>
          )}

          {/* In-Person Schedule */}
          {isNewFormat && inPersonSchedule && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className={`h-5 w-5 ${
                  darkMode ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  In-Person Appointments
                </h3>
                {getAvailableDaysCount(inPersonSchedule) > 0 && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {getAvailableDaysCount(inPersonSchedule)} days
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {daysOfWeek.map((day) => renderScheduleDay(day, inPersonSchedule))}
              </div>
            </div>
          )}

          {/* Old Format - Single Schedule */}
          {!isNewFormat && availabilitySchedule && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className={`h-5 w-5 ${
                  darkMode ? 'text-emerald-400' : 'text-emerald-600'
                }`} />
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Availability Schedule
                </h3>
                {getAvailableDaysCount(availabilitySchedule) > 0 && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {getAvailableDaysCount(availabilitySchedule)} days
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {daysOfWeek.map((day) => renderScheduleDay(day, availabilitySchedule))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Settings */}
      {(data?.default_slot_duration_minutes || data?.slot_generation_days_ahead) && (
        <div className={`mt-6 p-4 rounded-lg border ${
          darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Schedule Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.default_slot_duration_minutes && (
              <div>
                <p className={`text-xs font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Default Slot Duration
                </p>
                <p className={`text-sm font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {data.default_slot_duration_minutes} minutes
                </p>
              </div>
            )}
            {data.slot_generation_days_ahead && (
              <div>
                <p className={`text-xs font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Slot Generation
                </p>
                <p className={`text-sm font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {data.slot_generation_days_ahead} days ahead
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleSection;
