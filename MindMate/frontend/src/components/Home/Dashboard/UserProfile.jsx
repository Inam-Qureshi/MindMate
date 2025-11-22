/**
 * Professional Patient Profile - Complete Redesign
 * ================================================
 * A comprehensive, professional patient profile page with real data integration.
 * 
 * Features:
 * - Professional layout similar to LinkedIn/medical platforms
 * - Real data from backend APIs
 * - Comprehensive profile sections
 * - Beautiful UI with animations
 * - Responsive design
 * 
 * Author: MindMate Team
 * Version: 3.0.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Heart,
  Activity,
  TrendingUp,
  Target,
  Award,
  BookOpen,
  FileText,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  CheckCircle,
  AlertCircle,
  Star,
  Zap,
  BarChart,
  Settings,
  Bell,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Share2,
  MessageCircle,
  ThumbsUp,
  Users,
  Home,
  Briefcase,
  Globe,
  DollarSign,
  PieChart,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  RefreshCw
} from 'react-feather';
import { API_URL, API_ENDPOINTS } from '../../../config/api';
import { AuthStorage } from '../../../utils/localStorage';
import { ROUTES } from '../../../config/routes';
import './UserProfile.css';

const UserProfile = ({ darkMode, user }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({});
  const [sensitiveFieldsVisible, setSensitiveFieldsVisible] = useState({});

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={20} /> },
    { id: 'personal', label: 'Personal Info', icon: <User size={20} /> },
    { id: 'medical', label: 'Medical History', icon: <Heart size={20} /> },
    { id: 'progress', label: 'Progress & Goals', icon: <TrendingUp size={20} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={20} /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={20} /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
  ];

  // Sensitive fields configuration
  const sensitiveFields = {
    email: { label: "Email", requiresVerification: true },
    phone: { label: "Phone", requiresVerification: false },
    date_of_birth: { label: "Date of Birth", requiresVerification: false }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = AuthStorage.getToken();

      if (!token) {
        setError("Authentication required. Please login again.");
        return;
      }

      const response = await axios.get(`${API_URL}${API_ENDPOINTS.USERS.PATIENT_PROFILE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Map backend response to frontend structure
      const mappedData = {
        personal: response.data.personal_info || {},
        location: response.data.location || {},
        medical: response.data.medical_history || {},
        questionnaire: response.data.questionnaire_data || {},
        progress: response.data.progress_tracking || {},
        goals: response.data.goals_section || {},
        journal: response.data.journal_entries || [],
        appointments: response.data.appointments || {},
        account: response.data.account || {}
      };

      setProfileData(mappedData);
      setFormData(mappedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching profile data:", err);
      
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        setTimeout(() => {
          AuthStorage.clearAuth();
          navigate(ROUTES.LOGIN, { replace: true });
        }, 2000);
      } else if (err.response?.status === 404) {
        setError("Profile not found. Please contact support.");
      } else {
        setError(`Failed to load profile data: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setFormData({ ...profileData });
      setHasChanges(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      // Map old field names to new structure
      // Convert 'personal_info.field' to 'personal.field'
      const mappedField = field.replace('personal_info', 'personal')
                                .replace('location_info', 'location');
      
      if (mappedField.includes('.')) {
        const [parent, child] = mappedField.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return {
        ...prev,
        [mappedField]: value
      };
    });
    setHasChanges(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      await axios.put(`${API_URL}${API_ENDPOINTS.USERS.PATIENT_PROFILE_UPDATE}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setProfileData(formData);
      setIsEditing(false);
      setHasChanges(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSensitiveField = (field) => {
    setSensitiveFieldsVisible(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className={`profile-page ${darkMode ? 'dark' : ''}`}>
        <div className="profile-container">
          <div className="profile-loading">
            <div className="loading-spinner"></div>
            <p>Loading your comprehensive profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`profile-page ${darkMode ? 'dark' : ''}`}>
        <div className="profile-container">
          <div className="profile-error">
            <AlertCircle className="error-icon" />
            <h3>Unable to load profile</h3>
            <p>{error}</p>
            <button onClick={fetchProfileData} className="retry-button">
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={`profile-page ${darkMode ? 'dark' : ''}`}>
        <div className="profile-container">
          <div className="profile-empty">
            <User className="empty-icon" />
            <h3>No profile data available</h3>
            <p>Please complete your profile setup</p>
          </div>
        </div>
      </div>
    );
  }

  const { personal_info, location, medical_history, mood_tracking, exercise_progress, streak, goals, journal, appointments, account } = profileData;

  return (
    <div className={`profile-page ${darkMode ? 'dark' : ''}`}>
      <div className="profile-container">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="profile-header"
        >
          <div className="profile-header-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <User size={40} />
                <button className="avatar-edit-btn">
                  <Camera size={16} />
                </button>
              </div>
              <div className="profile-basic-info">
                <h1 className="profile-name">
                  {personal_info?.first_name} {personal_info?.last_name}
                </h1>
                <p className="profile-title">Mental Health Patient</p>
                <div className="profile-badges">
                  <span className="badge verified">
                    <CheckCircle size={14} />
                    Verified
                  </span>
                  <span className="badge active">
                    <Activity size={14} />
                    Active
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-actions">
              <button className="action-btn secondary">
                <Share2 size={16} />
                Share
              </button>
              <button className="action-btn primary" onClick={handleEditToggle}>
                <Edit3 size={16} />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Profile Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="profile-navigation"
        >
          <div className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Profile Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="profile-content"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <OverviewTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                  isEditing={isEditing}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                />
              </motion.div>
            )}

            {activeTab === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <PersonalTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                  isEditing={isEditing}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                  sensitiveFieldsVisible={sensitiveFieldsVisible}
                  onToggleSensitiveField={toggleSensitiveField}
                />
              </motion.div>
            )}

            {activeTab === 'medical' && (
              <motion.div
                key="medical"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <MedicalTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                  isEditing={isEditing}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                />
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <ProgressTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                />
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <ActivityTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                />
              </motion.div>
            )}

            {activeTab === 'appointments' && (
              <motion.div
                key="appointments"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <AppointmentsTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                />
              </motion.div>
            )}

            {activeTab === 'journal' && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <JournalTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tab-content"
              >
                <SettingsTab 
                  profileData={profileData} 
                  darkMode={darkMode}
                  isEditing={isEditing}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Save Changes Bar */}
        {isEditing && hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="save-changes-bar"
          >
            <div className="save-changes-content">
              <div className="save-changes-text">
                <AlertCircle size={16} />
                <span>You have unsaved changes</span>
              </div>
              <div className="save-changes-actions">
                <button 
                  className="save-btn secondary"
                  onClick={() => {
                    setFormData({ ...profileData });
                    setHasChanges(false);
                  }}
                >
                  <X size={16} />
                  Discard
                </button>
                <button 
                  className="save-btn primary"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Tab Components
const OverviewTab = ({ profileData, darkMode, isEditing, formData, onFieldChange }) => {
  // Use the mapped structure
  const personal_info = profileData?.personal || {};
  const location = profileData?.location || {};
  const mood_tracking = profileData?.progress?.mood_tracking || {};
  const exercise_progress = profileData?.progress?.exercise_progress || {};
  const streak = profileData?.progress?.streak || {};
  const goals = profileData?.goals || {};

  return (
    <div className="overview-tab">
      <div className="overview-grid">
        {/* Quick Stats */}
        <div className="stats-section">
          <h3 className="section-title">Quick Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{streak?.current_streak || 0}</div>
                <div className="stat-label">Day Streak</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{exercise_progress?.total_sessions || 0}</div>
                <div className="stat-label">Sessions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Heart size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{mood_tracking?.average_mood || 0}/10</div>
                <div className="stat-label">Avg Mood</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Target size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{goals?.completed_goals || 0}</div>
                <div className="stat-label">Goals</div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="info-section">
          <h3 className="section-title">Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <Mail size={16} />
              <span className="info-label">Email</span>
              <span className="info-value">{personal_info?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <Phone size={16} />
              <span className="info-label">Phone</span>
              <span className="info-value">{personal_info?.phone || 'N/A'}</span>
            </div>
            <div className="info-item">
              <Calendar size={16} />
              <span className="info-label">Age</span>
              <span className="info-value">{personal_info?.age || 'N/A'}</span>
            </div>
            <div className="info-item">
              <MapPin size={16} />
              <span className="info-label">Location</span>
              <span className="info-value">{location?.city || 'N/A'}, {location?.province || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h3 className="section-title">Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">
                <Activity size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Completed breathing exercise</div>
                <div className="activity-time">2 hours ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <Heart size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Logged mood assessment</div>
                <div className="activity-time">1 day ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <Calendar size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Scheduled appointment</div>
                <div className="activity-time">3 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PersonalTab = ({ profileData, darkMode, isEditing, formData, onFieldChange, sensitiveFieldsVisible, onToggleSensitiveField }) => {
  // Use the mapped structure
  const personal_info = profileData?.personal || {};
  const location = profileData?.location || {};

  return (
    <div className="personal-tab">
      <div className="personal-grid">
        <div className="personal-section">
          <h3 className="section-title">Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="form-input"
                  value={formData.personal?.first_name || ''}
                  onChange={(e) => onFieldChange('personal_info.first_name', e.target.value)}
                />
              ) : (
                <div className="form-display">{personal_info?.first_name || 'N/A'}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="form-input"
                  value={formData.personal_info?.last_name || ''}
                  onChange={(e) => onFieldChange('personal_info.last_name', e.target.value)}
                />
              ) : (
                <div className="form-display">{personal_info?.last_name || 'N/A'}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="sensitive-field">
                {isEditing ? (
                  <input
                    type="email"
                    className="form-input"
                    value={formData.personal_info?.email || ''}
                    onChange={(e) => onFieldChange('personal_info.email', e.target.value)}
                  />
                ) : (
                  <div className="form-display">
                    {sensitiveFieldsVisible.email ? personal_info?.email : '••••••••@•••••.com'}
                    <button 
                      className="toggle-sensitive"
                      onClick={() => onToggleSensitiveField('email')}
                    >
                      {sensitiveFieldsVisible.email ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  className="form-input"
                  value={formData.personal_info?.phone || ''}
                  onChange={(e) => onFieldChange('personal_info.phone', e.target.value)}
                />
              ) : (
                <div className="form-display">{personal_info?.phone || 'N/A'}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  className="form-input"
                  value={formData.personal_info?.date_of_birth || ''}
                  onChange={(e) => onFieldChange('personal_info.date_of_birth', e.target.value)}
                />
              ) : (
                <div className="form-display">{personal_info?.date_of_birth ? new Date(personal_info.date_of_birth).toLocaleDateString() : 'N/A'}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              {isEditing ? (
                <select
                  className="form-input"
                  value={formData.personal_info?.gender || ''}
                  onChange={(e) => onFieldChange('personal_info.gender', e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <div className="form-display">{personal_info?.gender || 'N/A'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="location-section">
          <h3 className="section-title">Location Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">City</label>
              {isEditing ? (
                <input
                  type="text"
                  className="form-input"
                  value={formData.location?.city || ''}
                  onChange={(e) => onFieldChange('location.city', e.target.value)}
                />
              ) : (
                <div className="form-display">{location?.city || 'N/A'}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Province</label>
              {isEditing ? (
                <input
                  type="text"
                  className="form-input"
                  value={formData.location?.province || ''}
                  onChange={(e) => onFieldChange('location.province', e.target.value)}
                />
              ) : (
                <div className="form-display">{location?.province || 'N/A'}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              {isEditing ? (
                <input
                  type="text"
                  className="form-input"
                  value={formData.location?.country || ''}
                  onChange={(e) => onFieldChange('location.country', e.target.value)}
                />
              ) : (
                <div className="form-display">{location?.country || 'N/A'}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MedicalTab = ({ profileData, darkMode, isEditing, formData, onFieldChange }) => {
  const medical_history = profileData?.medical || {};

  return (
    <div className="medical-tab">
      <div className="medical-grid">
        <div className="medical-section">
          <h3 className="section-title">Medical History</h3>
          <div className="medical-info">
            <div className="medical-item">
              <div className="medical-label">Mental Health Conditions</div>
              <div className="medical-value">
                {medical_history?.mental_health_conditions?.join(', ') || 'None reported'}
              </div>
            </div>
            <div className="medical-item">
              <div className="medical-label">Current Medications</div>
              <div className="medical-value">
                {medical_history?.current_medications?.join(', ') || 'None reported'}
              </div>
            </div>
            <div className="medical-item">
              <div className="medical-label">Previous Therapy</div>
              <div className="medical-value">
                {medical_history?.previous_therapy ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="medical-item">
              <div className="medical-label">Emergency Contact</div>
              <div className="medical-value">
                {medical_history?.emergency_contact || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgressTab = ({ profileData, darkMode }) => {
  const mood_tracking = profileData?.progress?.mood_tracking || {};
  const exercise_progress = profileData?.progress?.exercise_progress || {};
  const streak = profileData?.progress?.streak || {};
  const goals = profileData?.goals || {};

  return (
    <div className="progress-tab">
      <div className="progress-grid">
        <div className="progress-section">
          <h3 className="section-title">Mood Tracking</h3>
          <div className="mood-stats">
            <div className="mood-item">
              <div className="mood-label">Average Mood</div>
              <div className="mood-value">{mood_tracking?.average_mood || 0}/10</div>
            </div>
            <div className="mood-item">
              <div className="mood-label">Total Assessments</div>
              <div className="mood-value">{mood_tracking?.total_assessments || 0}</div>
            </div>
            <div className="mood-item">
              <div className="mood-label">Last Assessment</div>
              <div className="mood-value">{mood_tracking?.last_assessment || 'Never'}</div>
            </div>
          </div>
        </div>

        <div className="progress-section">
          <h3 className="section-title">Exercise Progress</h3>
          <div className="exercise-stats">
            <div className="exercise-item">
              <div className="exercise-label">Total Sessions</div>
              <div className="exercise-value">{exercise_progress?.total_sessions || 0}</div>
            </div>
            <div className="exercise-item">
              <div className="exercise-label">Total Time</div>
              <div className="exercise-value">{exercise_progress?.total_time_hours || 0} hours</div>
            </div>
            <div className="exercise-item">
              <div className="exercise-label">Favorite Exercise</div>
              <div className="exercise-value">{exercise_progress?.favorite_exercise || 'None'}</div>
            </div>
          </div>
        </div>

        <div className="progress-section">
          <h3 className="section-title">Streak & Goals</h3>
          <div className="streak-goals">
            <div className="streak-item">
              <div className="streak-label">Current Streak</div>
              <div className="streak-value">{streak?.current_streak || 0} days</div>
            </div>
            <div className="streak-item">
              <div className="streak-label">Longest Streak</div>
              <div className="streak-value">{streak?.longest_streak || 0} days</div>
            </div>
            <div className="streak-item">
              <div className="streak-label">Completed Goals</div>
              <div className="streak-value">{goals?.completed_goals || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityTab = ({ profileData, darkMode }) => {
  return (
    <div className="activity-tab">
      <div className="activity-section">
        <h3 className="section-title">Recent Activity</h3>
        <div className="activity-timeline">
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-title">Completed breathing exercise</div>
              <div className="timeline-time">2 hours ago</div>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-title">Logged mood assessment</div>
              <div className="timeline-time">1 day ago</div>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-title">Scheduled appointment</div>
              <div className="timeline-time">3 days ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentsTab = ({ profileData, darkMode }) => {
  const appointments = profileData?.appointments?.appointments_list || [];

  return (
    <div className="appointments-tab">
      <div className="appointments-section">
        <h3 className="section-title">Appointments</h3>
        <div className="appointments-list">
          {appointments?.map((appointment, index) => (
            <div key={index} className="appointment-item">
              <div className="appointment-info">
                <div className="appointment-specialist">{appointment.specialist_name}</div>
                <div className="appointment-date">{appointment.date}</div>
                <div className="appointment-status">{appointment.status}</div>
              </div>
            </div>
          )) || (
            <div className="no-appointments">
              <Calendar size={48} />
              <p>No appointments scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JournalTab = ({ profileData, darkMode }) => {
  const journal = profileData?.journal || [];

  return (
    <div className="journal-tab">
      <div className="journal-section">
        <h3 className="section-title">Journal Entries</h3>
        <div className="journal-list">
          {journal?.map((entry, index) => (
            <div key={index} className="journal-item">
              <div className="journal-date">{entry.date}</div>
              <div className="journal-content">{entry.content}</div>
            </div>
          )) || (
            <div className="no-journal">
              <BookOpen size={48} />
              <p>No journal entries yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsTab = ({ profileData, darkMode, isEditing, formData, onFieldChange }) => {
  return (
    <div className="settings-tab">
      <div className="settings-section">
        <h3 className="section-title">Account Settings</h3>
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-label">Email Notifications</div>
            <div className="setting-control">
              <input type="checkbox" defaultChecked />
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">SMS Notifications</div>
            <div className="setting-control">
              <input type="checkbox" />
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Data Privacy</div>
            <div className="setting-control">
              <button className="setting-btn">Manage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;