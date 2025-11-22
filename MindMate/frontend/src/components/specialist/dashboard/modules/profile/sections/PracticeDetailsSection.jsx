import React from 'react';
import { DollarSign, Globe, Calendar, CheckCircle, X, XCircle, MessageCircle } from 'react-feather';

const PracticeDetailsSection = ({ darkMode, data }) => {
  const formatCurrency = (amount, currency) => {
    if (!amount) return 'Not set';
    const currencySymbol = currency === 'USD' ? '$' : 'PKR ';
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  const formatConsultationModes = (modes) => {
    if (!modes || !Array.isArray(modes) || modes.length === 0) return null;
    return modes.map(mode => {
      const formatted = typeof mode === 'string' 
        ? mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        : mode;
      return formatted;
    });
  };

  const hasData = data.consultation_fee || data.currency || data.consultation_modes || 
                  data.availability_status || data.accepting_new_patients !== undefined ||
                  data.languages_spoken || data.availability_schedule || data.weekly_schedule;

  if (!hasData) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Calendar className="h-5 w-5" />
        <span>Practice Details</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data.consultation_fee || data.currency) && (
          <div className="flex items-start space-x-2">
            <DollarSign className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Consultation Fee
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(data.consultation_fee, data.currency)}
              </p>
            </div>
          </div>
        )}

        {data.consultation_modes && data.consultation_modes.length > 0 && (
          <div className="flex items-start space-x-2">
            <Globe className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Consultation Modes
              </p>
              <div className="flex flex-wrap gap-2">
                {formatConsultationModes(data.consultation_modes).map((mode, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      darkMode
                        ? 'bg-emerald-900 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {mode}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {data.availability_status && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Availability Status
            </p>
            <div className="flex items-center space-x-2">
              {data.availability_status === 'available' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {typeof data.availability_status === 'string'
                  ? data.availability_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  : data.availability_status
                }
              </p>
            </div>
          </div>
        )}

        {data.accepting_new_patients !== undefined && (
          <div className="flex items-center space-x-2">
            {data.accepting_new_patients ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.accepting_new_patients ? 'Accepting New Patients' : 'Not Accepting New Patients'}
            </p>
          </div>
        )}

        {data.languages_spoken && data.languages_spoken.length > 0 && (
          <div className="flex items-start space-x-2 md:col-span-2">
            <MessageCircle className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Languages Spoken
              </p>
              <div className="flex flex-wrap gap-2">
                {data.languages_spoken.map((lang, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      darkMode
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Note: Availability Schedule is displayed in WeeklyScheduleSection component */}
      </div>
    </div>
  );
};

export default PracticeDetailsSection;

