import React from 'react';
import { User, Mail, Phone, Calendar, MapPin, FileText } from 'react-feather';

const BasicInfoSection = ({ darkMode, data }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
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

  const formatGender = (gender) => {
    if (!gender) return 'Not provided';
    if (typeof gender === 'string') {
      return gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return gender;
  };

  const hasData = data.first_name || data.last_name || data.email || data.phone || 
                  data.date_of_birth || data.gender || data.city || data.address || data.cnic_number;

  if (!hasData) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <User className="h-5 w-5" />
        <span>Basic Information</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.first_name && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              First Name
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.first_name}
            </p>
          </div>
        )}

        {data.last_name && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Last Name
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.last_name}
            </p>
          </div>
        )}

        {data.email && (
          <div className="flex items-start space-x-2">
            <Mail className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Email
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.email}
              </p>
            </div>
          </div>
        )}

        {data.phone && (
          <div className="flex items-start space-x-2">
            <Phone className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Phone
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.phone}
              </p>
            </div>
          </div>
        )}

        {data.date_of_birth && (
          <div className="flex items-start space-x-2">
            <Calendar className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Date of Birth
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatDate(data.date_of_birth)}
              </p>
            </div>
          </div>
        )}

        {data.gender && (
          <div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gender
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatGender(data.gender)}
            </p>
          </div>
        )}

        {data.cnic_number && (
          <div className="flex items-start space-x-2">
            <FileText className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                CNIC Number
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.cnic_number}
              </p>
            </div>
          </div>
        )}

        {data.city && (
          <div className="flex items-start space-x-2">
            <MapPin className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                City
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.city}
              </p>
            </div>
          </div>
        )}

        {data.address && (
          <div className="md:col-span-2">
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Address
            </p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.address}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicInfoSection;

