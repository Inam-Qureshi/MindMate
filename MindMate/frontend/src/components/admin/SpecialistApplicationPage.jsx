import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Eye,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Award,
  Briefcase,
  Heart,
  MessageSquare,
  AlertCircle,
  File as FileImage,
  FileText as FilePdf
} from 'react-feather';
import { toast } from 'react-hot-toast';
import { useAdminAPI } from '../../hooks/useAdminAPI';
import { api } from '../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../config/api';
import { ROUTES } from '../../config/routes';
import { APIErrorHandler } from '../../utils/errorHandler';

const SpecialistApplicationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const adminAPI = useAdminAPI();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    loadApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use useAdminAPI hook instead of direct axios call
      const applicationData = await adminAPI.getSpecialistApplication(id);
      setApplication(applicationData);
    } catch (err) {
      const errorInfo = APIErrorHandler.handleAdminError(err, 'application');
      setError(errorInfo.message);
      toast.error(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    try {
      setProcessing(true);
      
      // Use useAdminAPI hook based on action type
      let response;
      if (approvalAction === 'approve') {
        response = await adminAPI.approveSpecialist(id, {
          reason: "Application approved by admin",
          admin_notes: approvalNotes
        });
      } else if (approvalAction === 'reject') {
        response = await adminAPI.rejectSpecialist(id, {
          reason: rejectionReason || "Application rejected by admin",
          admin_notes: approvalNotes
        });
      } else {
        throw new Error('Invalid approval action');
      }
      
      toast.success(response?.message || `Application ${approvalAction}d successfully`);
      setShowApprovalModal(false);
      setApprovalNotes('');
      setRejectionReason('');
      loadApplication(); // Reload to get updated status
    } catch (err) {
      const errorInfo = APIErrorHandler.handleAdminError(err, 'application');
      toast.error(errorInfo.message);
    } finally {
      setProcessing(false);
    }
  };

  const resolveDocumentUrl = (docMeta) => {
    const fileUrl = docMeta?.file_url || docMeta?.document_url || docMeta?.url;
    if (!fileUrl || typeof fileUrl !== 'string') {
      return null;
    }

    return fileUrl.startsWith('http')
      ? fileUrl
      : `${window.location.origin}${fileUrl}`;
  };

  const openDocument = (docMeta, options = {}) => {
    try {
      const { download = false } = options;
      const absoluteUrl = resolveDocumentUrl(docMeta);

      if (!absoluteUrl) {
        throw new Error('Document URL unavailable');
      }

      const link = document.createElement('a');
      link.href = absoluteUrl;

      if (download) {
        link.setAttribute('download', docMeta?.document_name || 'document');
      } else {
        link.setAttribute('target', '_blank');
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error opening document:', err);
      toast.error('Unable to open document. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'suspended': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application || !application.specialist) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Application not found'}</p>
          <button
            onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { specialist, approval_data, documents, timeline, verification_status, review } = application;
  const documentsList = Array.isArray(documents) ? documents : [];

  // Safety check - ensure specialist object exists
  if (!specialist) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading...</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Processing application data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Specialist Application Review
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {specialist.first_name} {specialist.last_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(specialist.approval_status)}`}>
                {getStatusIcon(specialist.approval_status)}
                <span className="capitalize">{specialist.approval_status}</span>
              </div>
              
              {specialist.approval_status === 'pending' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setApprovalAction('approve');
                      setShowApprovalModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => {
                      setApprovalAction('reject');
                      setShowApprovalModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'timeline', label: 'Timeline', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            specialist={specialist}
            approval_data={approval_data}
            verification_status={verification_status}
            review={review}
          />
        )}
        
        {activeTab === 'documents' && (
          <DocumentsTab 
            documents={documentsList} 
            onPreviewDocument={setDocumentPreview}
            onDownloadDocument={(doc) => openDocument(doc, { download: true })}
          />
        )}
      {documentPreview && (
        <DocumentPreviewModal
          document={documentPreview}
          onClose={() => setDocumentPreview(null)}
          onFallbackOpen={() => {
            openDocument(documentPreview, { download: false });
            setDocumentPreview(null);
          }}
          resolveDocumentUrl={resolveDocumentUrl}
        />
      )}

        
        {activeTab === 'timeline' && (
          <TimelineTab timeline={timeline} />
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          action={approvalAction}
          notes={approvalNotes}
          setNotes={setApprovalNotes}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          onClose={() => setShowApprovalModal(false)}
          onConfirm={handleApproval}
          processing={processing}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ specialist, approval_data, verification_status, review }) => {
  const documentsVerified = verification_status?.documents_verified ?? 0;
  const totalDocuments = verification_status?.total_documents ?? 0;
  const backgroundCheckStatus = verification_status?.background_check ?? 'pending';
  const complianceCheckStatus = verification_status?.compliance_check ?? 'pending';
  const formattedReviewDate = review?.reviewed_at
    ? new Date(review.reviewed_at).toLocaleString()
    : 'Not reviewed yet';

  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Personal Information</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
              <p className="text-gray-900 dark:text-white">{specialist.first_name} {specialist.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{specialist.email}</span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
              <p className="text-gray-900 dark:text-white flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>{specialist.phone || 'N/A'}</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CNIC Number</label>
              <p className="text-gray-900 dark:text-white">{specialist.cnic_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</label>
              <p className="text-gray-900 dark:text-white capitalize">{specialist.gender || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
              <p className="text-gray-900 dark:text-white flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{specialist.date_of_birth ? new Date(specialist.date_of_birth).toLocaleDateString() : 'N/A'}</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Profile Completion</label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${specialist.profile_completion_percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{specialist.profile_completion_percentage}%</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Date</label>
              <p className="text-gray-900 dark:text-white">{new Date(specialist.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Professional Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                          <Award className="h-5 w-5" />
          <span>Professional Information</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Qualification</label>
              <p className="text-gray-900 dark:text-white">{specialist.qualification || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Institution</label>
              <p className="text-gray-900 dark:text-white">{specialist.institution || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Years of Experience</label>
              <p className="text-gray-900 dark:text-white">{specialist.years_experience || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Affiliation</label>
              <p className="text-gray-900 dark:text-white">{specialist.current_affiliation || 'N/A'}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Clinic Address</label>
              <p className="text-gray-900 dark:text-white flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>{specialist.clinic_address || 'N/A'}</span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Consultation Fee</label>
              <p className="text-gray-900 dark:text-white">
                {specialist.consultation_fee ? `${specialist.currency} ${specialist.consultation_fee}` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Consultation Modes</label>
              <div className="flex flex-wrap gap-2">
                {specialist.consultation_modes?.map((mode, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                    {mode}
                  </span>
                )) || <span className="text-gray-500">N/A</span>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Specializations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Heart className="h-5 w-5" />
          <span>Specializations & Therapy Methods</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Mental Health Specialties</label>
            <div className="flex flex-wrap gap-2">
              {specialist.specialties_in_mental_health?.map((specialty, index) => (
                <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                  {specialty}
                </span>
              )) || <span className="text-gray-500">N/A</span>}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Therapy Methods</label>
            <div className="flex flex-wrap gap-2">
              {specialist.therapy_methods?.map((method, index) => (
                <span key={index} className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                  {method}
                </span>
              )) || <span className="text-gray-500">N/A</span>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Experience Summary */}
      {specialist.experience_summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Experience Summary</span>
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{specialist.experience_summary}</p>
        </motion.div>
      )}

      {/* Verification Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Verification Status</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {documentsVerified}/{totalDocuments}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Documents Verified</p>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold capitalize ${
              backgroundCheckStatus === 'completed' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {backgroundCheckStatus}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Background Check</p>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold capitalize ${
              complianceCheckStatus === 'completed' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {complianceCheckStatus}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Compliance Check</p>
          </div>
        </div>
      </motion.div>

      {/* Review Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Review Summary</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Approval Status</label>
            <p className={`text-lg font-semibold capitalize ${
              specialist.approval_status === 'approved'
                ? 'text-green-600 dark:text-green-400'
                : specialist.approval_status === 'rejected'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {specialist.approval_status || 'pending'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reviewed At</label>
            <p className="text-gray-900 dark:text-white">{formattedReviewDate}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reviewed By (Admin ID)</label>
            <p className="text-gray-900 dark:text-white">{review?.reviewed_by || '—'}</p>
          </div>

          {review?.admin_notes && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Admin Notes</label>
              <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                {review.admin_notes}
              </p>
            </div>
          )}

          {review?.rejection_reason && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejection Reason</label>
              <p className="mt-1 text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {review.rejection_reason}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Documents Tab Component
const DocumentsTab = ({ documents, onPreviewDocument, onDownloadDocument }) => {
  const getDocumentIcon = (documentType) => {
    switch (documentType) {
      case 'profile_photo': return <FileImage className="h-5 w-5" />;
      case 'license': return <FilePdf className="h-5 w-5" />;
      case 'degree': return <FilePdf className="h-5 w-5" />;
      case 'cnic': return <FilePdf className="h-5 w-5" />;
      case 'experience_letter': return <FilePdf className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Documents</h3>
        <p className="text-gray-600 dark:text-gray-400">No documents have been uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Uploaded Documents ({documents.length})</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getDocumentIcon(doc.document_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {doc.document_name || doc.document_type || 'Document'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {doc.document_type ? doc.document_type.replace(/_/g, ' ') : ''}
                  </p>
                  
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationColor(doc.verification_status)}`}>
                      {doc.verification_status || 'pending'}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => onPreviewDocument(doc)}
                      className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center justify-center space-x-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => onDownloadDocument(doc)}
                      className="flex-1 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 flex items-center justify-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </div>
                  
                  {doc.verification_notes && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                      <strong>Notes:</strong> {doc.verification_notes}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Timeline Tab Component
const TimelineTab = ({ timeline }) => {
  const getStepIcon = (step) => {
    switch (step) {
      case 'registration': return <User className="h-4 w-4" />;
      case 'profile_completion': return <FileText className="h-4 w-4" />;
      case 'submission': return <CheckCircle className="h-4 w-4" />;
      case 'review': return <Eye className="h-4 w-4" />;
      case 'decision': return <Award className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStepColor = (step) => {
    switch (step) {
      case 'registration': return 'bg-blue-500';
      case 'profile_completion': return 'bg-green-500';
      case 'submission': return 'bg-purple-500';
      case 'review': return 'bg-orange-500';
      case 'decision': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Timeline</h3>
        <p className="text-gray-600 dark:text-gray-400">No timeline data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
        <Clock className="h-5 w-5" />
        <span>Application Timeline</span>
      </h2>
      
      <div className="space-y-4">
        {timeline.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-4"
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getStepColor(item.step)} flex items-center justify-center text-white`}>
              {getStepIcon(item.step)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {item.description}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              
              {item.details && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.details}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Approval Modal Component
const ApprovalModal = ({ 
  action, 
  notes, 
  setNotes, 
  rejectionReason, 
  setRejectionReason, 
  onClose, 
  onConfirm, 
  processing 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {action === 'approve' ? 'Approve Application' : 'Reject Application'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add your notes here..."
              />
            </div>
            
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Reason for rejection..."
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                action === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? 'Processing...' : (action === 'approve' ? 'Approve' : 'Reject')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SpecialistApplicationPage;

const DocumentPreviewModal = ({ document, onClose, onFallbackOpen, resolveDocumentUrl }) => {
  const documentUrl = resolveDocumentUrl(document);
  const fileName = document?.document_name || document?.document_type || 'Document';

  if (!documentUrl) {
    toast.error('Document URL unavailable');
    onClose();
    return null;
  }

  const extension = documentUrl.split('.').pop()?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension || '');
  const isPDF = extension === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-6xl h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {fileName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{document?.document_type?.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onFallbackOpen}
              className="px-3 py-1 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Eye size={14} />
              Open in new tab
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-auto">
          {isImage && (
            <img
              src={documentUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {isPDF && (
            <iframe
              title={fileName}
              src={`${documentUrl}#view=FitH`}
              className="w-full h-full"
            />
          )}

          {!isImage && !isPDF && (
            <div className="text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-gray-700 dark:text-gray-300">
                Preview not available for this file type. Use "Open in new tab" to view.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
