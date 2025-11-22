import React, { useState, useEffect } from 'react';
import { Save } from 'react-feather';

const ProfessionalStatementForm = ({ darkMode, data, onSave, onDirty, saving }) => {
  const [formData, setFormData] = useState({
    professional_statement_intro: '',
    professional_statement_role: '',
    professional_statement_qualifications: '',
    professional_statement_experience: '',
    professional_statement_patient_satisfaction: '',
    professional_statement_appointment_details: '',
    professional_statement_clinic_address: '',
    professional_statement_fee_details: '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        professional_statement_intro: data.professional_statement_intro || '',
        professional_statement_role: data.professional_statement_role || '',
        professional_statement_qualifications: data.professional_statement_qualifications || '',
        professional_statement_experience: data.professional_statement_experience || '',
        professional_statement_patient_satisfaction: data.professional_statement_patient_satisfaction || '',
        professional_statement_appointment_details: data.professional_statement_appointment_details || '',
        professional_statement_clinic_address: data.professional_statement_clinic_address || '',
        professional_statement_fee_details: data.professional_statement_fee_details || '',
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    onDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Map to backend schema format
    const payload = {
      intro: formData.professional_statement_intro || null,
      role_of_psychologists: formData.professional_statement_role || null,
      qualifications_detail: formData.professional_statement_qualifications || null,
      experience_detail: formData.professional_statement_experience || null,
      patient_satisfaction_team: formData.professional_statement_patient_satisfaction || null,
      appointment_details: formData.professional_statement_appointment_details || null,
      clinic_address: formData.professional_statement_clinic_address || null,
      fee_details: formData.professional_statement_fee_details || null,
    };
    onSave(payload);
  };

  const statementFields = [
    { key: 'professional_statement_intro', label: 'Introduction', rows: 4 },
    { key: 'professional_statement_role', label: 'Role of Psychologists', rows: 4 },
    { key: 'professional_statement_qualifications', label: 'Qualifications Detail', rows: 4 },
    { key: 'professional_statement_experience', label: 'Experience Detail', rows: 4 },
    { key: 'professional_statement_patient_satisfaction', label: 'Patient Satisfaction & Team', rows: 4 },
    { key: 'professional_statement_appointment_details', label: 'Appointment Details', rows: 4 },
    { key: 'professional_statement_clinic_address', label: 'Clinic Address', rows: 3 },
    { key: 'professional_statement_fee_details', label: 'Fee Details', rows: 3 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {statementFields.map((field) => (
        <div key={field.key}>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {field.label}
          </label>
          <textarea
            name={field.key}
            value={formData[field.key]}
            onChange={handleChange}
            rows={field.rows}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formData[field.key]?.length || 0} characters
          </p>
        </div>
      ))}

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

export default ProfessionalStatementForm;

