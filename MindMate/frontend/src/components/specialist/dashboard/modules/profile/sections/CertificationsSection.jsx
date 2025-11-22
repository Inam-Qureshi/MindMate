import React from 'react';
import { Award, Calendar } from 'react-feather';

const CertificationsSection = ({ darkMode, data }) => {
  const certificationRecords = data.certification_records || data.certifications || [];

  if (!certificationRecords || certificationRecords.length === 0) return null;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Award className="h-5 w-5" />
        <span>Certifications</span>
      </h2>

      <div className="space-y-4">
        {certificationRecords.map((record, idx) => (
          <div
            key={record.id || idx}
            className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {record.name || 'Certification'}
                </h3>
                <div className="flex items-center space-x-4 text-sm mb-2">
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {record.issuing_body}
                  </p>
                  {record.year && (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {record.year}
                    </p>
                  )}
                  {record.credential_id && (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      ID: {record.credential_id}
                    </p>
                  )}
                </div>
                {record.expiry_date && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className={`h-3 w-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Expires: {formatDate(record.expiry_date)}
                    </p>
                  </div>
                )}
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

export default CertificationsSection;

