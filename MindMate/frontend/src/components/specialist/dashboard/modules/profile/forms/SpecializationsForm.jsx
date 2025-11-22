import React, { useState, useEffect } from 'react';
import { Save } from 'react-feather';

const SpecializationsForm = ({ darkMode, data, dropdownOptions, onSave, onDirty, saving }) => {
  const [formData, setFormData] = useState({
    specialties_in_mental_health: [],
    therapy_methods: [],
  });

  useEffect(() => {
    if (data) {
      setFormData({
        specialties_in_mental_health: data.specialties_in_mental_health || [],
        therapy_methods: data.therapy_methods || [],
      });
    }
  }, [data]);

  const handleSpecialtyToggle = (specialty) => {
    setFormData(prev => {
      const specialties = prev.specialties_in_mental_health || [];
      const newSpecialties = specialties.includes(specialty)
        ? specialties.filter(s => s !== specialty)
        : [...specialties, specialty];
      return { ...prev, specialties_in_mental_health: newSpecialties };
    });
    onDirty();
  };

  const handleTherapyMethodToggle = (method) => {
    setFormData(prev => {
      const methods = prev.therapy_methods || [];
      const newMethods = methods.includes(method)
        ? methods.filter(m => m !== method)
        : [...methods, method];
      return { ...prev, therapy_methods: newMethods };
    });
    onDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const specialties = dropdownOptions?.mental_health_specialties || [];
  const therapyMethods = dropdownOptions?.therapy_methods || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Mental Health Specialties
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {specialties.map((specialty) => (
            <label
              key={specialty.value}
              className={`flex items-start space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.specialties_in_mental_health?.includes(specialty.value)
                  ? darkMode
                    ? 'bg-purple-900 border-purple-700'
                    : 'bg-purple-100 border-purple-500'
                  : darkMode
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.specialties_in_mental_health?.includes(specialty.value) || false}
                onChange={() => handleSpecialtyToggle(specialty.value)}
                className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {specialty.label}
                </span>
                {specialty.description && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {specialty.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Therapy Methods
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {therapyMethods.map((method) => (
            <label
              key={method.value}
              className={`flex items-start space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.therapy_methods?.includes(method.value)
                  ? darkMode
                    ? 'bg-teal-900 border-teal-700'
                    : 'bg-teal-100 border-teal-500'
                  : darkMode
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.therapy_methods?.includes(method.value) || false}
                onChange={() => handleTherapyMethodToggle(method.value)}
                className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {method.label}
                </span>
                {method.description && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {method.description}
                  </p>
                )}
              </div>
            </label>
          ))}
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

export default SpecializationsForm;

