import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, Download, CheckCircle, AlertCircle, Clock, X } from 'react-feather';
import specialistProfileService from '../../../../../services/api/specialistProfile';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import EmptyState from '../../shared/EmptyState';
import StatusBadge from '../../shared/StatusBadge';

const DocumentsManagement = ({ darkMode, compact = false, onNavigateToFullPage }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: 'license',
    document_name: '',
    expiry_date: '',
    file: null
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const documentTypes = [
    { value: 'license', label: 'Professional License', icon: '📜' },
    { value: 'degree', label: 'Educational Degree', icon: '🎓' },
    { value: 'certification', label: 'Certification', icon: '⭐' },
    { value: 'cnic', label: 'Identity Card (CNIC)', icon: '🪪' },
    { value: 'profile_photo', label: 'Profile Photo', icon: '📷' },
    { value: 'supporting_document', label: 'Supporting Document', icon: '📄' }
  ];

  const getDocumentIcon = (type) => {
    const doc = documentTypes.find(d => d.value === type);
    return doc?.icon || '📄';
  };

  const getDocumentLabel = (type) => {
    const doc = documentTypes.find(d => d.value === type);
    return doc?.label || type;
  };

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      // Get application status which includes document information
      const status = await specialistProfileService.getApplicationStatus();
      
      // Extract documents from approval data
      // Note: Documents are stored in registration_documents in approval_data
      // For now, we'll show pending documents from application status
      const docs = [];
      
      if (status.pending_documents && status.pending_documents.length > 0) {
        status.pending_documents.forEach((docName, idx) => {
          docs.push({
            id: `pending-${idx}`,
            document_name: docName,
            document_type: docName.toLowerCase().includes('cnic') ? 'cnic' :
                          docName.toLowerCase().includes('license') ? 'license' :
                          docName.toLowerCase().includes('degree') ? 'degree' : 'other',
            verification_status: 'pending',
            upload_date: new Date().toISOString()
          });
        });
      }
      
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      setUploadForm(prev => ({ ...prev, file }));
      setUploadError('');
    }
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({ ...prev, [name]: value }));
    setUploadError('');
  };

  // Handle document upload
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const response = await specialistProfileService.uploadDocument(
        uploadForm.file,
        uploadForm.document_type
      );

      setUploadSuccess(true);
      
      // Reset form
      setUploadForm({
        document_type: 'license',
        document_name: '',
        expiry_date: '',
        file: null
      });

      // Refresh documents list
      await fetchDocuments();

      // Close modal after delay
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
      }, 2000);

    } catch (err) {
      console.error('Error uploading document:', err);
      setUploadError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        'Failed to upload document'
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle document deletion
  const handleDelete = async (documentId, documentName) => {
    if (!window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      // Note: Document deletion endpoint may not exist in the backend
      // For now, we'll just show an alert
      alert('Document deletion is not yet implemented. Please contact support if you need to remove a document.');
      
      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(err.response?.data?.detail || 'Failed to delete document');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'verified':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
      case 'rejected':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <LoadingState message="Loading documents..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchDocuments} />;
  }

  return (
    <div className="space-y-6">
      {/* Header - Only show if not compact */}
      {!compact && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Documents & Verification
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload and manage your professional documents
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Upload className="h-5 w-5" />
            <span>Upload Document</span>
          </button>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Documents Uploaded"
          message="Upload your professional documents to complete your verification process."
          actionButton={
            !compact && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>Upload First Document</span>
              </button>
            )
          }
        />
      ) : (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {(compact ? documents.slice(0, 3) : documents).map((doc, index) => (
            <motion.div
              key={doc.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 rounded-xl border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } hover:shadow-lg transition-shadow`}
            >
              {/* Document Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{getDocumentIcon(doc.document_type)}</div>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {doc.document_name || getDocumentLabel(doc.document_type)}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getDocumentLabel(doc.document_type)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleDelete(doc.id, doc.document_name)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Document Info */}
              <div className="space-y-2 mb-4">
                {doc.upload_date && (
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-medium">Uploaded:</span>{' '}
                    {new Date(doc.upload_date).toLocaleDateString()}
                  </div>
                )}
                {doc.expiry_date && (
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-medium">Expires:</span>{' '}
                    {new Date(doc.expiry_date).toLocaleDateString()}
                  </div>
                )}
                {doc.file_size && (
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-medium">Size:</span>{' '}
                    {(doc.file_size / 1024).toFixed(2)} KB
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                  getStatusColor(doc.verification_status || doc.status || 'pending')
                }`}>
                  {getStatusIcon(doc.verification_status || doc.status || 'pending')}
                  <span className="capitalize">
                    {doc.verification_status || doc.status || 'Pending'}
                  </span>
                </div>

                {doc.verification_notes && (
                  <div className="text-xs text-gray-500" title={doc.verification_notes}>
                    ℹ️ Notes
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Show more message in compact mode */}
      {compact && documents.length > 3 && (
        <div className={`text-center pt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p className="text-sm">
            Showing 3 of {documents.length} documents. 
            {onNavigateToFullPage && (
              <button
                onClick={onNavigateToFullPage}
                className="ml-2 text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all documents
              </button>
            )}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => !uploadLoading && setShowUploadModal(false)}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-lg rounded-2xl shadow-2xl p-6 ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Upload Document</h2>
                  <button
                    onClick={() => !uploadLoading && setShowUploadModal(false)}
                    disabled={uploadLoading}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Success Message */}
                {uploadSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 p-4 rounded-lg bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 mb-4"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-900 dark:text-green-100">
                      Document uploaded successfully!
                    </p>
                  </motion.div>
                )}

                {/* Error Message */}
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 mb-4"
                  >
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-900 dark:text-red-100">{uploadError}</p>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleUpload} className="space-y-4">
                  {/* Document Type */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Document Type *
                    </label>
                    <select
                      name="document_type"
                      value={uploadForm.document_type}
                      onChange={handleInputChange}
                      disabled={uploadLoading}
                      required
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>


                  {/* File Upload */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Select File *
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploadLoading}
                      required
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Accepted formats: PDF, JPG, PNG • Max size: 10MB
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      disabled={uploadLoading}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      } ${uploadLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadLoading || uploadSuccess}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white transition-all ${
                        uploadLoading || uploadSuccess
                          ? 'bg-emerald-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {uploadLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : uploadSuccess ? (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Uploaded!</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentsManagement;

