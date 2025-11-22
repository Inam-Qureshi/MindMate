import React from 'react';
import { FileText } from 'react-feather';

const ProfessionalStatementSection = ({ darkMode, data }) => {
  const statementFields = [
    { key: 'professional_statement_intro', label: 'Introduction' },
    { key: 'professional_statement_role', label: 'Role of Psychologists' },
    { key: 'professional_statement_qualifications', label: 'Qualifications Detail' },
    { key: 'professional_statement_experience', label: 'Experience Detail' },
    { key: 'professional_statement_patient_satisfaction', label: 'Patient Satisfaction & Team' },
    { key: 'professional_statement_appointment_details', label: 'Appointment Details' },
    { key: 'professional_statement_clinic_address', label: 'Clinic Address' },
    { key: 'professional_statement_fee_details', label: 'Fee Details' },
  ];

  // Check if professional statement exists (either as object or individual fields)
  const hasStatement = data.professional_statement || 
    statementFields.some(field => data[field.key]);

  if (!hasStatement) return null;

  // If professional_statement is an object, use it; otherwise use individual fields
  const statement = data.professional_statement || {};

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <FileText className="h-5 w-5" />
        <span>Professional Statement</span>
      </h2>

      <div className="space-y-6">
        {statementFields.map((field) => {
          const value = statement[field.key] || 
                       statement[field.key.replace('professional_statement_', '')] ||
                       data[field.key];
          
          if (!value) return null;

          return (
            <div key={field.key}>
              <h3 className={`text-sm font-semibold mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {field.label}
              </h3>
              <p className={`whitespace-pre-line ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfessionalStatementSection;

