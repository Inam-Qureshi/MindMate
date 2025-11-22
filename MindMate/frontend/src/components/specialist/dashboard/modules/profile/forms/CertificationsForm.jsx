import React, { useState, useEffect } from 'react';
import { Save, Plus, Edit2, Trash2, X } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';
import CertificationsManager from '../managers/CertificationsManager';

const CertificationsForm = ({ darkMode, data, onSave, onDirty, saving }) => {
  const [certificationRecords, setCertificationRecords] = useState([]);
  const [showManager, setShowManager] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    if (data) {
      setCertificationRecords(data.certification_records || data.certifications || []);
    }
  }, [data]);

  const handleAdd = () => {
    setEditingRecord(null);
    setShowManager(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowManager(true);
  };

  const handleDelete = (recordId) => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      setCertificationRecords(prev => prev.filter(r => (r.id || r) !== recordId));
      onDirty();
    }
  };

  const handleSaveRecord = (record) => {
    if (editingRecord) {
      setCertificationRecords(prev =>
        prev.map(r => (r.id || r) === (editingRecord.id || editingRecord) ? record : r)
      );
    } else {
      setCertificationRecords(prev => [...prev, record]);
    }
    setShowManager(false);
    setEditingRecord(null);
    onDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave({ certification_records: certificationRecords });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Certification Records
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Add your professional certifications
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add Certification</span>
          </button>
        </div>

        {certificationRecords.length === 0 ? (
          <div className={`text-center py-8 rounded-lg ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No certifications added yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {certificationRecords.map((record, idx) => {
              const recordId = record.id || idx;
              return (
                <div
                  key={recordId}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {record.name || 'Certification'}
                      </h4>
                      <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {record.issuing_body}
                        {record.year && ` • ${record.year}`}
                        {record.credential_id && ` • ID: ${record.credential_id}`}
                      </p>
                      {record.expiry_date && (
                        <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Expires: {new Date(record.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                      {record.description && (
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {record.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleEdit(record)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(recordId)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-200 text-red-600'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

      <AnimatePresence>
        {showManager && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setShowManager(false)}
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {editingRecord ? 'Edit Certification' : 'Add Certification'}
                  </h2>
                  <button
                    onClick={() => setShowManager(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <CertificationsManager
                  darkMode={darkMode}
                  record={editingRecord}
                  onSave={handleSaveRecord}
                  onCancel={() => setShowManager(false)}
                />
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CertificationsForm;

