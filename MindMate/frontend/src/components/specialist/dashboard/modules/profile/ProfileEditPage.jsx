import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ArrowLeft } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import specialistProfileService from '../../../../../services/api/specialistProfile';

// Import all form components
import BasicInfoForm from './forms/BasicInfoForm';
import ProfessionalInfoForm from './forms/ProfessionalInfoForm';
import PracticeDetailsForm from './forms/PracticeDetailsForm';
import SpecializationsForm from './forms/SpecializationsForm';
import EducationForm from './forms/EducationForm';
import CertificationsForm from './forms/CertificationsForm';
import ExperienceForm from './forms/ExperienceForm';
import ProfessionalStatementForm from './forms/ProfessionalStatementForm';
import InterestsForm from './forms/InterestsForm';
import ClinicInfoForm from './forms/ClinicInfoForm';

const ProfileEditPage = ({ darkMode, onNavigateToView, onSave }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set(['basic']));
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [dirtySections, setDirtySections] = useState(new Set());

  const sections = [
    { id: 'basic', label: 'Basic Information', icon: '👤' },
    { id: 'professional', label: 'Professional Information', icon: '💼' },
    { id: 'clinic', label: 'Clinic & Online Presence', icon: '🏥' },
    { id: 'practice', label: 'Practice Details', icon: '📅' },
    { id: 'specializations', label: 'Specializations', icon: '🎯' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'certifications', label: 'Certifications', icon: '⭐' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'statement', label: 'Professional Statement', icon: '📝' },
    { id: 'interests', label: 'Interests', icon: '❤️' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profile, options] = await Promise.all([
        specialistProfileService.getOwnProfile(),
        specialistProfileService.getDropdownOptions(),
      ]);
      setProfileData(profile);
      setDropdownOptions(options);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const markSectionDirty = (sectionId) => {
    setDirtySections(prev => new Set(prev).add(sectionId));
  };

  const handleSectionSave = async (sectionId, sectionData) => {
    const specialistId = profileData?.id;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let response;
      
      switch (sectionId) {
        case 'basic':
        case 'professional':
        case 'clinic':
        case 'practice':
          response = await specialistProfileService.updateProfile(specialistId, sectionData);
          break;
        case 'interests':
          response = await specialistProfileService.updateInterests(specialistId, sectionData.interests || []);
          break;
        case 'statement':
          response = await specialistProfileService.updateProfessionalStatement(specialistId, sectionData);
          break;
        case 'education':
          response = await specialistProfileService.updateEducation(specialistId, sectionData.education_records || []);
          break;
        case 'certifications':
          response = await specialistProfileService.updateCertifications(specialistId, sectionData.certification_records || []);
          break;
        case 'experience':
          response = await specialistProfileService.updateExperience(specialistId, sectionData.experience_records || []);
          break;
        case 'specializations':
          // Specializations are stored as specialties_in_mental_health and therapy_methods
          response = await specialistProfileService.updateProfile(specialistId, {
            specialties_in_mental_health: sectionData.specialties_in_mental_health || [],
            therapy_methods: sectionData.therapy_methods || []
          });
          break;
        default:
          throw new Error(`Unknown section: ${sectionId}`);
      }

      setProfileData(prev => ({ ...prev, ...sectionData }));
      setDirtySections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (onSave) {
        onSave(response);
      }
    } catch (err) {
      console.error(`Error saving ${sectionId}:`, err);
      setSaveError(err.response?.data?.detail || err.message || `Failed to save ${sectionId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading profile data..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
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
            <div className="flex items-center space-x-4">
              {onNavigateToView && (
                <button
                  onClick={onNavigateToView}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-700 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Edit Profile
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Update your professional information and credentials
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      <div className="px-6 pt-4">
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-3 p-4 rounded-lg bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 mb-4"
            >
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-900 dark:text-green-100">
                Profile updated successfully!
              </p>
            </motion.div>
          )}

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-3 p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 mb-4"
            >
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-900 dark:text-red-100">{saveError}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Sections */}
      <div className="p-6 space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const isDirty = dirtySections.has(section.id);

          return (
            <div
              key={section.id}
              className={`rounded-xl border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } ${isDirty ? 'ring-2 ring-emerald-500' : ''}`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between p-4 text-left ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } transition-colors`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{section.icon}</span>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {section.label}
                    </h3>
                    {isDirty && (
                      <p className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Unsaved changes
                      </p>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                )}
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                      {section.id === 'basic' && (
                        <BasicInfoForm
                          darkMode={darkMode}
                          data={profileData}
                          dropdownOptions={dropdownOptions}
                          onSave={(data) => handleSectionSave('basic', data)}
                          onDirty={() => markSectionDirty('basic')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'professional' && (
                        <ProfessionalInfoForm
                          darkMode={darkMode}
                          data={profileData}
                          dropdownOptions={dropdownOptions}
                          onSave={(data) => handleSectionSave('professional', data)}
                          onDirty={() => markSectionDirty('professional')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'clinic' && (
                        <ClinicInfoForm
                          darkMode={darkMode}
                          data={profileData}
                          onSave={(data) => handleSectionSave('clinic', data)}
                          onDirty={() => markSectionDirty('clinic')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'practice' && (
                        <PracticeDetailsForm
                          darkMode={darkMode}
                          data={profileData}
                          dropdownOptions={dropdownOptions}
                          onSave={(data) => handleSectionSave('practice', data)}
                          onDirty={() => markSectionDirty('practice')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'specializations' && (
                        <SpecializationsForm
                          darkMode={darkMode}
                          data={profileData}
                          dropdownOptions={dropdownOptions}
                          onSave={(data) => handleSectionSave('specializations', data)}
                          onDirty={() => markSectionDirty('specializations')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'education' && (
                        <EducationForm
                          darkMode={darkMode}
                          data={profileData}
                          onSave={(data) => handleSectionSave('education', data)}
                          onDirty={() => markSectionDirty('education')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'certifications' && (
                        <CertificationsForm
                          darkMode={darkMode}
                          data={profileData}
                          onSave={(data) => handleSectionSave('certifications', data)}
                          onDirty={() => markSectionDirty('certifications')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'experience' && (
                        <ExperienceForm
                          darkMode={darkMode}
                          data={profileData}
                          onSave={(data) => handleSectionSave('experience', data)}
                          onDirty={() => markSectionDirty('experience')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'statement' && (
                        <ProfessionalStatementForm
                          darkMode={darkMode}
                          data={profileData}
                          onSave={(data) => handleSectionSave('statement', data)}
                          onDirty={() => markSectionDirty('statement')}
                          saving={saving}
                        />
                      )}
                      {section.id === 'interests' && (
                        <InterestsForm
                          darkMode={darkMode}
                          data={profileData}
                          onSave={(data) => handleSectionSave('interests', data)}
                          onDirty={() => markSectionDirty('interests')}
                          saving={saving}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileEditPage;

