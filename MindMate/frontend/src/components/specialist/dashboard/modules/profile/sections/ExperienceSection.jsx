import React from 'react';
import { Briefcase, Calendar } from 'react-feather';

const ExperienceSection = ({ darkMode, data }) => {
  const experienceRecords = data.experience_records || data.experience || [];

  if (!experienceRecords || experienceRecords.length === 0) return null;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateRange = (startDate, endDate, isCurrent) => {
    const start = formatDate(startDate);
    if (isCurrent) {
      return `${start} - Present`;
    }
    const end = formatDate(endDate);
    if (start && end) {
      return `${start} - ${end}`;
    }
    if (start) return start;
    return null;
  };

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Briefcase className="h-5 w-5" />
        <span>Professional Experience</span>
      </h2>

      <div className="space-y-4">
        {experienceRecords.map((record, idx) => (
          <div
            key={record.id || idx}
            className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {record.title || 'Position'}
                  </h3>
                  {record.is_current && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      darkMode
                        ? 'bg-green-900 text-green-300'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      Current
                    </span>
                  )}
                </div>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {record.company || 'Company'}
                </p>
                <div className="flex items-center space-x-4 text-sm mb-2">
                  {formatDateRange(record.start_date, record.end_date, record.is_current) && (
                    <div className="flex items-center space-x-1">
                      <Calendar className={`h-3 w-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {formatDateRange(record.start_date, record.end_date, record.is_current)}
                      </p>
                    </div>
                  )}
                  {record.years && (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {record.years} {record.years === 1 ? 'year' : 'years'}
                    </p>
                  )}
                </div>
                {record.description && (
                  <p className={`text-sm whitespace-pre-line ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {record.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceSection;

