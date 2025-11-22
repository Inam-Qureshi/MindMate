import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, X, AlertCircle, Copy } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';

const AvailabilityScheduleBuilder = ({ darkMode, schedule, onChange, appointmentType = 'online', label = null }) => {
  const daysOfWeek = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
  ];

  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    // Initialize with default structure for all days
    const defaultSchedule = {};
    daysOfWeek.forEach(day => {
      defaultSchedule[day.key] = {
        is_available: false,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
      };
    });
    
    // Merge with provided schedule, ensuring all days are present
    if (schedule && typeof schedule === 'object') {
      daysOfWeek.forEach(day => {
        if (schedule[day.key]) {
          defaultSchedule[day.key] = {
            is_available: schedule[day.key].is_available !== undefined ? schedule[day.key].is_available : false,
            start_time: schedule[day.key].start_time || schedule[day.key].startTime || '09:00',
            end_time: schedule[day.key].end_time || schedule[day.key].endTime || '17:00',
            slot_duration_minutes: schedule[day.key].slot_duration_minutes || schedule[day.key].slotDurationMinutes || 30,
          };
        }
      });
    }
    
    return defaultSchedule;
  });

  const [timeError, setTimeError] = useState({});

  useEffect(() => {
    // Always ensure all days are present when schedule updates
    if (schedule && typeof schedule === 'object') {
      const updatedSchedule = {};
      daysOfWeek.forEach(day => {
        if (schedule[day.key]) {
          updatedSchedule[day.key] = {
            is_available: schedule[day.key].is_available !== undefined ? schedule[day.key].is_available : false,
            start_time: schedule[day.key].start_time || schedule[day.key].startTime || '09:00',
            end_time: schedule[day.key].end_time || schedule[day.key].endTime || '17:00',
            slot_duration_minutes: schedule[day.key].slot_duration_minutes || schedule[day.key].slotDurationMinutes || 30,
          };
        } else {
          updatedSchedule[day.key] = {
            is_available: false,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_minutes: 30,
          };
        }
      });
      setWeeklySchedule(updatedSchedule);
      validateTimes(updatedSchedule);
    } else {
      // Initialize with all days if no schedule provided
      const defaultSchedule = {};
      daysOfWeek.forEach(day => {
        defaultSchedule[day.key] = {
          is_available: false,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
        };
      });
      setWeeklySchedule(defaultSchedule);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  const validateTimes = (scheduleToValidate) => {
    const errors = {};
    daysOfWeek.forEach(day => {
      const dayData = scheduleToValidate[day.key];
      if (dayData && dayData.is_available) {
        const start = dayData.start_time || dayData.startTime;
        const end = dayData.end_time || dayData.endTime;
        if (start && end) {
          const [startHour, startMin] = start.split(':').map(Number);
          const [endHour, endMin] = end.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (endMinutes <= startMinutes) {
            errors[day.key] = 'End time must be after start time';
          }
        }
      }
    });
    setTimeError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDayToggle = (dayKey) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      const currentDay = newSchedule[dayKey] || {
        is_available: false,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
      };
      
      newSchedule[dayKey] = {
        ...currentDay,
        is_available: !currentDay.is_available,
        // Ensure times are set even when toggling
        start_time: currentDay.start_time || currentDay.startTime || '09:00',
        end_time: currentDay.end_time || currentDay.endTime || '17:00',
        slot_duration_minutes: currentDay.slot_duration_minutes || currentDay.slotDurationMinutes || 30,
      };
      
      validateTimes(newSchedule);
      onChange(newSchedule);
      return newSchedule;
    });
  };

  const handleTimeChange = (dayKey, field, value) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[dayKey] = {
        ...newSchedule[dayKey],
        [field]: value,
      };
      validateTimes(newSchedule);
      onChange(newSchedule);
      return newSchedule;
    });
  };

  const copyToAllDays = (sourceDayKey) => {
    const sourceDay = weeklySchedule[sourceDayKey];
    if (!sourceDay || !sourceDay.is_available) return;

    setWeeklySchedule(prev => {
      const newSchedule = { ...prev };
      daysOfWeek.forEach(day => {
        if (day.key !== sourceDayKey) {
          newSchedule[day.key] = {
            is_available: sourceDay.is_available,
            start_time: sourceDay.start_time || sourceDay.startTime,
            end_time: sourceDay.end_time || sourceDay.endTime,
            slot_duration_minutes: sourceDay.slot_duration_minutes || sourceDay.slotDurationMinutes,
          };
        }
      });
      validateTimes(newSchedule);
      onChange(newSchedule);
      return newSchedule;
    });
  };

  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const availableDaysCount = Object.values(weeklySchedule).filter(day => day.is_available).length;

  return (
    <div className="space-y-4">
      {label && (
        <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </div>
      )}
      
      {/* Summary Stats */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${
        darkMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="font-medium">{availableDaysCount}</span> of {daysOfWeek.length} days available
        </div>
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {appointmentType === 'online' ? '💻' : '🏥'} {appointmentType.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {daysOfWeek.map((day) => {
          const dayData = weeklySchedule[day.key] || {
            is_available: false,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_minutes: 30,
          };

          const hasError = timeError[day.key];
          const startTime = dayData.start_time || dayData.startTime || '09:00';
          const endTime = dayData.end_time || dayData.endTime || '17:00';

          return (
            <motion.div
              key={day.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                dayData.is_available
                  ? darkMode
                    ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-600 shadow-lg shadow-emerald-900/20'
                    : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-400 shadow-md shadow-emerald-100'
                  : darkMode
                  ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              } ${hasError ? 'border-red-500' : ''}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    dayData.is_available 
                      ? 'bg-emerald-500' 
                      : 'bg-gray-400'
                  }`} />
                  <h3 className={`font-bold text-sm ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {day.short}
                  </h3>
                </div>
                <div className="flex items-center space-x-1">
                  {dayData.is_available && (
                    <button
                      type="button"
                      onClick={() => copyToAllDays(day.key)}
                      className={`p-1 rounded hover:bg-opacity-20 ${
                        darkMode 
                          ? 'hover:bg-gray-600 text-gray-400' 
                          : 'hover:bg-gray-200 text-gray-600'
                      } transition-colors`}
                      title="Copy to all days"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDayToggle(day.key)}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${
                      dayData.is_available
                        ? darkMode
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/50'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                        : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    {dayData.is_available ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <X className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {hasError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 p-2 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700"
                  >
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                      <p className="text-xs text-red-700 dark:text-red-300">{hasError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Time Controls */}
              <AnimatePresence>
                {dayData.is_available && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 mt-3"
                  >
                    {/* Time Range Display */}
                    <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                      darkMode ? 'bg-gray-900/50' : 'bg-white'
                    }`}>
                      <Clock className={`h-3.5 w-3.5 ${
                        darkMode ? 'text-emerald-400' : 'text-emerald-600'
                      }`} />
                      <span className={`text-xs font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {startTime} - {endTime}
                      </span>
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Start Time
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => handleTimeChange(day.key, 'start_time', e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-white hover:border-gray-500 focus:border-emerald-500'
                            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-emerald-500'
                        } focus:ring-2 focus:ring-emerald-500/50 focus:outline-none`}
                      >
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* End Time */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        End Time
                      </label>
                      <select
                        value={endTime}
                        onChange={(e) => handleTimeChange(day.key, 'end_time', e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-white hover:border-gray-500 focus:border-emerald-500'
                            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-emerald-500'
                        } focus:ring-2 focus:ring-emerald-500/50 focus:outline-none`}
                      >
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Slot Duration */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Slot Duration
                      </label>
                      <select
                        value={dayData.slot_duration_minutes || dayData.slotDurationMinutes || 30}
                        onChange={(e) => handleTimeChange(day.key, 'slot_duration_minutes', parseInt(e.target.value))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-white hover:border-gray-500 focus:border-emerald-500'
                            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-emerald-500'
                        } focus:ring-2 focus:ring-emerald-500/50 focus:outline-none`}
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={90}>90 minutes</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Unavailable State */}
              {!dayData.is_available && (
                <div className={`text-center py-2 mt-2 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  <p className="text-xs">Not Available</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      {availableDaysCount > 0 && (
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
        }`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            💡 Tip: Click the copy icon to copy a day's schedule to all other days
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityScheduleBuilder;
