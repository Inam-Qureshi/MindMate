import React from 'react';
import { Book } from 'react-feather';

const EducationSection = ({ darkMode, data }) => {
  const educationRecords = data.education_records || data.education || [];

  if (!educationRecords || educationRecords.length === 0) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Book className="h-5 w-5" />
        <span>Education</span>
      </h2>

      <div className="space-y-4">
        {educationRecords.map((record, idx) => (
          <div
            key={record.id || idx}
            className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {record.degree || 'Degree'}
                  {record.field_of_study && ` - ${record.field_of_study}`}
                </h3>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {record.institution}
                  {record.year && ` • ${record.year}`}
                  {record.gpa && ` • GPA: ${record.gpa}`}
                </p>
                {record.description && (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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

export default EducationSection;

