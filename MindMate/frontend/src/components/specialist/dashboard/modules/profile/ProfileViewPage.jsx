import React, { useState, useEffect } from 'react';
import { Edit2, FileText, Star, CheckCircle, Clock, X, AlertCircle } from 'react-feather';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import specialistProfileService from '../../../../../services/api/specialistProfile';

// Import all sections
import ProfileHeader from './sections/ProfileHeader';
import BasicInfoSection from './sections/BasicInfoSection';
import ProfessionalInfoSection from './sections/ProfessionalInfoSection';
import PracticeDetailsSection from './sections/PracticeDetailsSection';
import SpecializationsSection from './sections/SpecializationsSection';
import EducationSection from './sections/EducationSection';
import CertificationsSection from './sections/CertificationsSection';
import ExperienceSection from './sections/ExperienceSection';
import ProfessionalStatementSection from './sections/ProfessionalStatementSection';
import InterestsSection from './sections/InterestsSection';
import ClinicInfoSection from './sections/ClinicInfoSection';
import ProfileStatsSection from './sections/ProfileStatsSection';
import WeeklyScheduleSection from './sections/WeeklyScheduleSection';
import ReviewsDisplay from './ReviewsDisplay';
import DocumentsManagement from './DocumentsManagement';

const ProfileViewPage = ({ darkMode, onNavigateToEdit, onNavigateToDocuments }) => {
  const [profileData, setProfileData] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfileData();
    fetchApplicationStatus();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await specialistProfileService.getOwnProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStatus = async () => {
    try {
      const status = await specialistProfileService.getApplicationStatus();
      setApplicationStatus(status);
    } catch (err) {
      console.error('Error fetching application status:', err);
    }
  };

  const getApprovalStatusBadge = () => {
    if (!applicationStatus) return null;

    const status = applicationStatus.approval_status?.toLowerCase();
    const statusConfig = {
      approved: {
        icon: CheckCircle,
        color: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400',
        label: 'Approved',
      },
      pending: {
        icon: Clock,
        color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400',
        label: 'Pending Review',
      },
      under_review: {
        icon: Clock,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400',
        label: 'Under Review',
      },
      rejected: {
        icon: X,
        color: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400',
        label: 'Rejected',
      },
    };

    const config = statusConfig[status] || {
      icon: AlertCircle,
      color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400',
      label: 'Unknown',
    };

    const Icon = config.icon;

    return (
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
    );
  };

  if (loading) {
    return <LoadingState message="Loading profile..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchProfileData} />;
  }

  if (!profileData) {
    return (
      <div className={`text-center p-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <p>No profile data available</p>
      </div>
    );
  }

  return (
    <div className={`min-h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Page Header */}
      <div className={`sticky top-0 z-10 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                My Profile
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                View your complete specialist profile
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {getApprovalStatusBadge()}
              {applicationStatus?.profile_completion_percentage !== undefined && (
                <div className={`text-sm px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  {applicationStatus.profile_completion_percentage}% Complete
                </div>
              )}
              {onNavigateToEdit && (
                <button
                  onClick={onNavigateToEdit}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    darkMode
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Application Status Section */}
        {applicationStatus && applicationStatus.approval_status !== 'approved' && (
          <div className={`p-6 rounded-xl border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start space-x-3">
              <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Application Status
                </h3>
                <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {applicationStatus.status_message || applicationStatus.message}
                </p>
                {applicationStatus.pending_documents && applicationStatus.pending_documents.length > 0 && (
                  <div className="mb-3">
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Pending Documents:
                    </p>
                    <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {applicationStatus.pending_documents.map((doc, idx) => (
                        <li key={idx} className="text-sm">{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {applicationStatus.rejection_reason && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                      Rejection Reason:
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {applicationStatus.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Header */}
        <ProfileHeader
          darkMode={darkMode}
          profileData={profileData}
          applicationStatus={applicationStatus}
        />

        {/* Stats Section */}
        <ProfileStatsSection darkMode={darkMode} data={profileData} />

        {/* Basic Information */}
        <BasicInfoSection darkMode={darkMode} data={profileData} />

        {/* Professional Information */}
        <ProfessionalInfoSection darkMode={darkMode} data={profileData} />

        {/* Clinic Information */}
        <ClinicInfoSection darkMode={darkMode} data={profileData} />

        {/* Practice Details */}
        <PracticeDetailsSection darkMode={darkMode} data={profileData} />

        {/* Weekly Schedule */}
        <WeeklyScheduleSection darkMode={darkMode} data={profileData} />

        {/* Specializations */}
        <SpecializationsSection darkMode={darkMode} data={profileData} />

        {/* Education */}
        <EducationSection darkMode={darkMode} data={profileData} />

        {/* Certifications */}
        <CertificationsSection darkMode={darkMode} data={profileData} />

        {/* Experience */}
        <ExperienceSection darkMode={darkMode} data={profileData} />

        {/* Professional Statement */}
        <ProfessionalStatementSection darkMode={darkMode} data={profileData} />

        {/* Interests */}
        <InterestsSection darkMode={darkMode} data={profileData} />

        {/* Reviews Section */}
        <div className={`rounded-xl p-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold flex items-center space-x-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Star className="h-5 w-5" />
              <span>Reviews & Ratings</span>
            </h2>
          </div>
          <ReviewsDisplay darkMode={darkMode} specialistId={profileData.id} />
        </div>

        {/* Documents Section */}
        <div className={`rounded-xl p-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold flex items-center space-x-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <FileText className="h-5 w-5" />
              <span>Documents</span>
            </h2>
            {onNavigateToDocuments && (
              <button
                onClick={onNavigateToDocuments}
                className={`text-sm px-3 py-1 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Manage Documents
              </button>
            )}
          </div>
          <DocumentsManagement 
            darkMode={darkMode} 
            compact={true}
            onNavigateToFullPage={onNavigateToDocuments}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileViewPage;

