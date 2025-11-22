import React from 'react';
import { Briefcase, Book, Award, Calendar, FileText } from 'react-feather';

const ProfessionalInfoSection = ({ darkMode, data }) => {
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

  const formatSpecialistType = (type) => {
    if (!type) return null;
    if (typeof type === 'string') {
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return type;
  };

  const hasData = data.specialist_type || data.qualification || data.institution || data.years_experience || 
                  data.current_affiliation || data.license_number || data.license_authority ||
                  data.license_expiry_date || data.bio || data.experience_summary || 
                  data.clinic_name || data.clinic_address;

  if (!hasData) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Briefcase className="h-5 w-5" />
        <span>Professional Information</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.specialist_type && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Specialist Type
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatSpecialistType(data.specialist_type)}
            </p>
          </div>
        )}

        {data.qualification && (
          <div className="flex items-start space-x-2">
            <Book className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Qualification
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.qualification}
              </p>
            </div>
          </div>
        )}

        {data.institution && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Institution
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.institution}
            </p>
          </div>
        )}

        {data.years_experience !== null && data.years_experience !== undefined && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Years of Experience
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.years_experience} {data.years_experience === 1 ? 'year' : 'years'}
            </p>
          </div>
        )}

        {data.current_affiliation && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Current Affiliation
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.current_affiliation}
            </p>
          </div>
        )}

        {data.license_number && (
          <div className="flex items-start space-x-2">
            <Award className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                License Number
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.license_number}
              </p>
            </div>
          </div>
        )}

        {data.license_authority && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              License Authority
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.license_authority}
            </p>
          </div>
        )}

        {data.license_expiry_date && (
          <div className="flex items-start space-x-2">
            <Calendar className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                License Expiry Date
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatDate(data.license_expiry_date)}
              </p>
            </div>
          </div>
        )}

        {data.bio && (
          <div className="md:col-span-2">
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Bio
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.bio}
            </p>
          </div>
        )}

        {data.clinic_name && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Clinic Name
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.clinic_name}
            </p>
          </div>
        )}

        {data.clinic_address && (
          <div className="md:col-span-2">
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Clinic Address
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.clinic_address}
            </p>
          </div>
        )}

        {data.experience_summary && (
          <div className="md:col-span-2">
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Experience Summary
            </p>
            <p className={`whitespace-pre-line ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.experience_summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalInfoSection;

