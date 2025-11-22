import React, { useState, useEffect } from 'react';
import { Save, X } from 'react-feather';

// Simple UUID generator
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const CertificationsManager = ({ darkMode, record, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    issuing_body: '',
    year: '',
    expiry_date: '',
    credential_id: '',
    description: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        name: record.name || '',
        issuing_body: record.issuing_body || '',
        year: record.year || '',
        expiry_date: record.expiry_date ? new Date(record.expiry_date).toISOString().split('T')[0] : '',
        credential_id: record.credential_id || '',
        description: record.description || '',
      });
    }
  }, [record]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.issuing_body.trim() || !formData.year) {
      alert('Please fill in all required fields: Name, Issuing Body, and Year');
      return;
    }
    const certificationRecord = {
      id: record?.id || generateId(),
      name: formData.name.trim(),
      issuing_body: formData.issuing_body.trim(),
      year: parseInt(formData.year),
      expiry_date: formData.expiry_date || null,
      credential_id: formData.credential_id.trim() || null,
      description: formData.description.trim() || null,
    };
    onSave(certificationRecord);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Certification Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., CBT Certification"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Issuing Body *
          </label>
          <input
            type="text"
            name="issuing_body"
            value={formData.issuing_body}
            onChange={handleChange}
            required
            placeholder="Organization that issued the certification"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Year *
          </label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            required
            min="1950"
            max={new Date().getFullYear()}
            placeholder="Year obtained"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Expiry Date
          </label>
          <input
            type="date"
            name="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Credential ID
          </label>
          <input
            type="text"
            name="credential_id"
            value={formData.credential_id}
            onChange={handleChange}
            placeholder="Certification ID or number"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Additional details about the certification..."
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <X className="h-4 w-4 inline mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
            'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
          }`}
        >
          <Save className="h-5 w-5" />
          <span>{record ? 'Update' : 'Add'} Certification</span>
        </button>
      </div>
    </form>
  );
};

export default CertificationsManager;

