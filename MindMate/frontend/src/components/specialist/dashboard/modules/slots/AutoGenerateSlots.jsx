import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, AlertCircle, CheckCircle, Settings } from 'react-feather';
import apiClient from '../../../../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../../../../config/api';
import specialistProfileService from '../../../../../services/api/specialistProfile';

const AutoGenerateSlots = ({ darkMode, onSuccess, onScheduleNeeded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [checkingSchedule, setCheckingSchedule] = useState(true);
  const [hasSchedule, setHasSchedule] = useState(false);

  // Check if schedule exists on mount
  useEffect(() => {
    console.log('AutoGenerateSlots component mounted, checking schedule...');
    checkSchedule();
  }, []);

  const checkSchedule = async () => {
    try {
      setCheckingSchedule(true);
      
      // Try to get schedule from specialist profile (availability_schedule field)
      // This is the primary source of schedule data
      console.log('Checking schedule from specialist profile...');
      let schedule = null;
      
      try {
        // First try the specialist profile service (recommended approach)
        const profileData = await specialistProfileService.getOwnProfile();
        console.log('Profile data:', profileData);
        
        // Check availability_schedule field
        let availabilitySchedule = profileData?.availability_schedule || profileData?.weekly_schedule;
        
        // Handle string format (JSON string)
        if (typeof availabilitySchedule === 'string') {
          try {
            availabilitySchedule = JSON.parse(availabilitySchedule);
          } catch (e) {
            console.warn('Failed to parse availability_schedule as JSON:', e);
          }
        }
        
        schedule = availabilitySchedule;
      } catch (profileErr) {
        console.warn('Error fetching profile via service, trying direct API call:', profileErr);
        
        // Fallback 1: Try direct profile endpoint
        try {
          const profileResponse = await apiClient.get(API_ENDPOINTS.SPECIALISTS.PRIVATE_PROFILE);
          let availabilitySchedule = profileResponse.data?.availability_schedule || profileResponse.data?.weekly_schedule;
          
          if (typeof availabilitySchedule === 'string') {
            try {
              availabilitySchedule = JSON.parse(availabilitySchedule);
            } catch (e) {
              console.warn('Failed to parse availability_schedule as JSON:', e);
            }
          }
          
          schedule = availabilitySchedule;
        } catch (directErr) {
          console.warn('Direct profile API call failed, trying weekly schedule endpoint:', directErr);
          
          // Fallback 2: Try weekly schedule endpoint
          try {
            const scheduleResponse = await apiClient.get(API_ENDPOINTS.WEEKLY_SCHEDULE.GET);
            schedule = scheduleResponse.data?.weekly_schedule;
          } catch (scheduleErr) {
            console.error('All endpoints failed. Profile service:', profileErr, 'Direct API:', directErr, 'Schedule API:', scheduleErr);
          }
        }
      }
      
      console.log('Schedule data:', schedule);
      
      // Check if schedule has at least one available day
      if (schedule && typeof schedule === 'object') {
        // Check if it's new format (nested with online/in_person) or old format (flat)
        const hasOnline = schedule.online && typeof schedule.online === 'object';
        const hasInPerson = schedule.in_person && typeof schedule.in_person === 'object';
        
        let hasAvailableDay = false;
        
        if (hasOnline || hasInPerson) {
          // New format - check both online and in_person schedules
          const onlineSchedule = schedule.online || {};
          const inPersonSchedule = schedule.in_person || {};
          
          const checkDayAvailability = (daySchedule) => {
            return daySchedule && typeof daySchedule === 'object' && 
                   daySchedule.is_available !== false && 
                   daySchedule.start_time && 
                   daySchedule.end_time;
          };
          
          hasAvailableDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            .some(day => {
              const onlineDay = onlineSchedule[day];
              const inPersonDay = inPersonSchedule[day];
              return checkDayAvailability(onlineDay) || checkDayAvailability(inPersonDay);
            });
        } else {
          // Old format - flat structure
          hasAvailableDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            .some(day => {
              const dayData = schedule[day];
              return dayData && typeof dayData === 'object' && 
                     dayData.is_available !== false && 
                     dayData.start_time && 
                     dayData.end_time;
            });
        }
        
        console.log('Has available day:', hasAvailableDay);
        setHasSchedule(hasAvailableDay);
        
        if (!hasAvailableDay && onScheduleNeeded) {
          onScheduleNeeded();
        }
      } else {
        console.log('No valid schedule found');
        setHasSchedule(false);
        if (onScheduleNeeded) {
          onScheduleNeeded();
        }
      }
    } catch (err) {
      console.error('Error checking schedule:', err);
      console.error('Schedule check error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setHasSchedule(false);
      if (onScheduleNeeded) {
        onScheduleNeeded();
      }
    } finally {
      setCheckingSchedule(false);
    }
  };

  const generateSlots = async () => {
    console.log('generateSlots called', { hasSchedule, loading, success });
    
    if (!hasSchedule) {
      console.warn('No schedule found, calling onScheduleNeeded');
      if (onScheduleNeeded) {
        onScheduleNeeded();
      }
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Calculate dates for next week (7 days from today)
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1); // Start from tomorrow
      
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7); // End 7 days from today

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const endpoint = API_ENDPOINTS.WEEKLY_SCHEDULE.GENERATE_SLOTS;
      const requestBody = {
        start_date: startDateStr,
        end_date: endDateStr,
        force_regenerate: false
      };

      console.log('=== GENERATING SLOTS ===');
      console.log('Endpoint:', endpoint);
      console.log('Full URL will be:', `${window.location.origin.replace(':5173', ':8000')}${endpoint}`);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      console.log('Token present:', !!localStorage.getItem('access_token'));
      console.log('Request timestamp:', new Date().toISOString());

      // Make the API call
      const response = await apiClient.post(endpoint, requestBody);

      console.log('✅ Slots generation SUCCESS');
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Full response data:', JSON.stringify(response.data, null, 2));
      console.log('Slots generated count:', response.data?.slots_generated);
      console.log('Generated slots array length:', response.data?.generated_slots?.length || 0);

      // Extract slots count from response
      const slotsCount = response.data?.slots_generated || 
                        response.data?.count || 
                        response.data?.generated_slots?.length || 
                        0;

      setSuccess(true);
      setGeneratedCount(slotsCount);
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess && onSuccess();
      }, 2000);

    } catch (err) {
      console.error('❌ Error generating slots:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Error response:', err.response);
      console.error('Error config:', err.config);
      console.error('Full error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers
      });
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        err.message ||
        'Failed to generate slots. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSchedule) {
    return (
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Checking availability schedule...
          </span>
        </div>
      </div>
    );
  }

  if (!hasSchedule) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-lg border-2 border-dashed ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-yellow-50 border-yellow-300'
        }`}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-yellow-900' : 'bg-yellow-100'
          }`}>
            <Settings className={`h-6 w-6 ${
              darkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Availability Schedule Required
            </h3>
            <p className={`text-sm mb-4 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              You need to set up your weekly availability schedule before generating slots. 
              This will define your available hours for the week.
            </p>
            <button
              onClick={() => onScheduleNeeded && onScheduleNeeded()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              Set Up Schedule
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`p-6 rounded-lg ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center space-x-3 p-4 rounded-lg bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800"
        >
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">
              Successfully generated {generatedCount} slots for the next week!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Slots have been created based on your weekly schedule.
            </p>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center space-x-3 p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </motion.div>
      )}

      {/* Info Card */}
      <div className={`p-4 rounded-lg mb-4 ${
        darkMode ? 'bg-gray-700' : 'bg-blue-50'
      }`}>
        <div className="flex items-start space-x-3">
          <Calendar className={`h-5 w-5 mt-0.5 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <div>
            <h4 className={`font-medium mb-1 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Auto-Generate Slots for Next Week
            </h4>
            <p className={`text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              This will automatically generate appointment slots for the next 7 days 
              based on your weekly availability schedule. Slots will be created separately 
              for online and in-person appointments if both are configured in your schedule.
            </p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={() => {
          console.log('Generate slots button clicked', { hasSchedule, loading, success });
          generateSlots();
        }}
        disabled={loading || success}
        className={`w-full px-6 py-3 rounded-lg font-medium text-white transition-all ${
          loading || success
            ? 'bg-emerald-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
        } flex items-center justify-center space-x-2`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Generating Slots...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Slots Generated!</span>
          </>
        ) : (
          <>
            <Clock className="h-5 w-5" />
            <span>Generate Slots for Next Week</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AutoGenerateSlots;

