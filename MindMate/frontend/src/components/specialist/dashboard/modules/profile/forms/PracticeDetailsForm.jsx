import React, { useState, useEffect } from 'react';
import { Save } from 'react-feather';
import AvailabilityScheduleBuilder from '../AvailabilityScheduleBuilder';

const PracticeDetailsForm = ({ darkMode, data, dropdownOptions, onSave, onDirty, saving }) => {
  const [formData, setFormData] = useState({
    consultation_fee: '',
    currency: 'PKR',
    consultation_modes: [],
    availability_status: 'accepting_new_patients',
    accepting_new_patients: true,
    languages_spoken: [],
    availability_schedule: {
      online: null,
      in_person: null,
    },
  });
  const [languageInput, setLanguageInput] = useState('');

  useEffect(() => {
    if (data) {
      // Handle both old format (single schedule) and new format (nested with online/in_person)
      let availabilitySchedule = data.availability_schedule || data.weekly_schedule || null;
      
      // If it's the old format (flat object), convert to new format
      if (availabilitySchedule && !availabilitySchedule.online && !availabilitySchedule.in_person) {
        // Old format - use same schedule for both
        availabilitySchedule = {
          online: availabilitySchedule,
          in_person: availabilitySchedule,
        };
      } else if (!availabilitySchedule) {
        availabilitySchedule = {
          online: null,
          in_person: null,
        };
      }
      
      setFormData({
        consultation_fee: data.consultation_fee || '',
        currency: data.currency || 'PKR',
        consultation_modes: data.consultation_modes || [],
        availability_status: data.availability_status || 'accepting_new_patients',
        accepting_new_patients: data.accepting_new_patients !== undefined ? data.accepting_new_patients : true,
        languages_spoken: data.languages_spoken || [],
        availability_schedule: availabilitySchedule,
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    onDirty();
  };

  const handleConsultationModeToggle = (mode) => {
    setFormData(prev => {
      const modes = prev.consultation_modes || [];
      const newModes = modes.includes(mode)
        ? modes.filter(m => m !== mode)
        : [...modes, mode];
      return { ...prev, consultation_modes: newModes };
    });
    onDirty();
  };

  const handleAddLanguage = () => {
    if (languageInput.trim()) {
      setFormData(prev => ({
        ...prev,
        languages_spoken: [...(prev.languages_spoken || []), languageInput.trim()],
      }));
      setLanguageInput('');
      onDirty();
    }
  };

  const handleRemoveLanguage = (lang) => {
    setFormData(prev => ({
      ...prev,
      languages_spoken: (prev.languages_spoken || []).filter(l => l !== lang),
    }));
    onDirty();
  };

  const handleScheduleChange = (schedule, appointmentType) => {
    setFormData(prev => ({
      ...prev,
      availability_schedule: {
        ...prev.availability_schedule,
        [appointmentType]: schedule,
      },
    }));
    onDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
    };
    onSave(payload);
  };

  const consultationModes = dropdownOptions?.consultation_modes || [];
  const currencies = dropdownOptions?.currencies || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Consultation Fee
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              name="consultation_fee"
              value={formData.consultation_fee}
              onChange={handleChange}
              min="0"
              step="100"
              placeholder="0"
              className={`flex-1 px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className={`px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            >
              {currencies.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Availability Status
          </label>
          <select
            name="availability_status"
            value={formData.availability_status}
            onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          >
            <option value="accepting_new_patients">Accepting New Patients</option>
            <option value="waitlist_only">Waitlist Only</option>
            <option value="not_accepting_new_patients">Not Accepting</option>
            <option value="temporarily_unavailable">Temporarily Unavailable</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Consultation Modes
          </label>
          <div className="flex flex-wrap gap-2">
            {consultationModes.map((mode) => (
              <label
                key={mode.value}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  formData.consultation_modes?.includes(mode.value)
                    ? darkMode
                      ? 'bg-emerald-900 border-emerald-700 text-emerald-300'
                      : 'bg-emerald-100 border-emerald-500 text-emerald-700'
                    : darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.consultation_modes?.includes(mode.value) || false}
                  onChange={() => handleConsultationModeToggle(mode.value)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm">{mode.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <input
              type="checkbox"
              name="accepting_new_patients"
              checked={formData.accepting_new_patients}
              onChange={handleChange}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium">Accepting New Patients</span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Languages Spoken
          </label>
          <div className="space-y-2">
            {formData.languages_spoken && formData.languages_spoken.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.languages_spoken.map((lang, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                      darkMode
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(lang)}
                      className={`ml-1 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex space-x-2">
              <input
                type="text"
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                placeholder="Add language (press Enter)"
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
              />
              <button
                type="button"
                onClick={handleAddLanguage}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="mb-4">
            <label className={`block text-base font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Weekly Availability Schedule
            </label>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Set your availability for online and in-person appointments. Toggle days on/off and configure time slots for each day.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Online Schedule */}
            <div className={`p-5 rounded-xl border-2 ${
              darkMode 
                ? 'bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700 shadow-lg' 
                : 'bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200 shadow-md'
            }`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${
                  darkMode ? 'bg-blue-900/50' : 'bg-blue-100'
                }`}>
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Online Appointments Schedule
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Set availability for video/phone consultations
                  </p>
                </div>
              </div>
              <AvailabilityScheduleBuilder
                darkMode={darkMode}
                schedule={formData.availability_schedule?.online || formData.availability_schedule}
                onChange={(schedule) => handleScheduleChange(schedule, 'online')}
                appointmentType="online"
                label={null}
              />
            </div>

            {/* In-Person Schedule */}
            <div className={`p-5 rounded-xl border-2 ${
              darkMode 
                ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700 shadow-lg' 
                : 'bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-200 shadow-md'
            }`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${
                  darkMode ? 'bg-purple-900/50' : 'bg-purple-100'
                }`}>
                  <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    In-Person Appointments Schedule
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Set availability for face-to-face consultations at your clinic
                  </p>
                </div>
              </div>
              <AvailabilityScheduleBuilder
                darkMode={darkMode}
                schedule={formData.availability_schedule?.in_person || formData.availability_schedule}
                onChange={(schedule) => handleScheduleChange(schedule, 'in_person')}
                appointmentType="in_person"
                label={null}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
            saving
              ? 'bg-emerald-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PracticeDetailsForm;

