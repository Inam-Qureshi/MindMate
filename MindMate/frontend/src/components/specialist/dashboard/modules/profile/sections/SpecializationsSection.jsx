import React from 'react';
import { Award, Crosshair } from 'react-feather';

const SpecializationsSection = ({ darkMode, data }) => {
  const formatSpecialty = (specialty) => {
    if (!specialty) return '';
    if (typeof specialty === 'string') {
      return specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return specialty;
  };

  const formatTherapyMethod = (method) => {
    if (!method) return '';
    if (typeof method === 'string') {
      // Keep short methods uppercase (CBT, DBT, ACT, EMDR)
      if (method.length <= 4) {
        return method.toUpperCase();
      }
      return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return method;
  };

  const hasData = (data.specialties_in_mental_health && data.specialties_in_mental_health.length > 0) ||
                  (data.therapy_methods && data.therapy_methods.length > 0);

  if (!hasData) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Award className="h-5 w-5" />
        <span>Specializations & Therapy Methods</span>
      </h2>

      <div className="space-y-6">
        {data.specialties_in_mental_health && data.specialties_in_mental_health.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Crosshair className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Mental Health Specialties
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.specialties_in_mental_health.map((specialty, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    darkMode
                      ? 'bg-purple-900 text-purple-300 border border-purple-700'
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}
                >
                  {formatSpecialty(specialty)}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.therapy_methods && data.therapy_methods.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Award className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Therapy Methods
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.therapy_methods.map((method, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    darkMode
                      ? 'bg-teal-900 text-teal-300 border border-teal-700'
                      : 'bg-teal-100 text-teal-700 border border-teal-200'
                  }`}
                >
                  {formatTherapyMethod(method)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecializationsSection;

