import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Edit3, 
  Save, 
  X, 
  Camera, 
  Award, 
  Trophy, 
  Star, 
  Heart, 
  MessageCircle, 
  ThumbsUp, 
  Eye, 
  Clock, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Shield, 
  Zap, 
  Target, 
  TrendingUp,
  BarChart3,
  Settings,
  Bell,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle
} from 'react-feather';

const UserProfile = ({ 
  profile, 
  onProfileUpdate,
  currentUserId,
  darkMode 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={18} /> },
    { id: 'activity', label: 'Activity', icon: <BarChart3 size={18} /> },
    { id: 'contributions', label: 'Contributions', icon: <Trophy size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  useEffect(() => {
    if (profile) {
      setEditedProfile({ ...profile });
    }
  }, [profile]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditedProfile({ ...profile });
    }
  };

  const handleProfileChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await onProfileUpdate(editedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile({ ...profile });
    setIsEditing(false);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getBadgeIcon = (badge) => {
    switch (badge.type) {
      case 'expert':
        return <Star size={16} />;
      case 'helper':
        return <Heart size={16} />;
      case 'contributor':
        return <MessageCircle size={16} />;
      case 'moderator':
        return <Shield size={16} />;
      default:
        return <Award size={16} />;
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge.type) {
      case 'expert':
        return 'text-purple-600 bg-purple-100';
      case 'helper':
        return 'text-green-600 bg-green-100';
      case 'contributor':
        return 'text-blue-600 bg-blue-100';
      case 'moderator':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getBadgeColorDark = (badge) => {
    switch (badge.type) {
      case 'expert':
        return 'text-purple-400 bg-purple-900';
      case 'helper':
        return 'text-green-400 bg-green-900';
      case 'contributor':
        return 'text-blue-400 bg-blue-900';
      case 'moderator':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="profile-overview">
            {/* Profile Header */}
            <div className="profile-header">
              <div className="profile-avatar">
                {editedProfile.avatar ? (
                  <img src={editedProfile.avatar} alt={editedProfile.name} />
                ) : (
                  <User size={32} />
                )}
                {isEditing && (
                  <button className="avatar-edit-btn">
                    <Camera size={16} />
                  </button>
                )}
              </div>
              
              <div className="profile-info">
                <div className="profile-name">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.name || ''}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="profile-input"
                    />
                  ) : (
                    <h2>{profile?.name || 'Unknown User'}</h2>
                  )}
                </div>
                
                <div className="profile-title">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.title || ''}
                      onChange={(e) => handleProfileChange('title', e.target.value)}
                      className="profile-input"
                      placeholder="Your title or role"
                    />
                  ) : (
                    <p>{profile?.title || 'Community Member'}</p>
                  )}
                </div>
                
                <div className="profile-bio">
                  {isEditing ? (
                    <textarea
                      value={editedProfile.bio || ''}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      className="profile-textarea"
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  ) : (
                    <p>{profile?.bio || 'No bio available'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="profile-stats">
              <div className="stat-item">
                <MessageCircle size={20} />
                <div className="stat-content">
                  <span className="stat-value">{formatNumber(profile?.questions_count || 0)}</span>
                  <span className="stat-label">Questions</span>
                </div>
              </div>
              
              <div className="stat-item">
                <ThumbsUp size={20} />
                <div className="stat-content">
                  <span className="stat-value">{formatNumber(profile?.answers_count || 0)}</span>
                  <span className="stat-label">Answers</span>
                </div>
              </div>
              
              <div className="stat-item">
                <Heart size={20} />
                <div className="stat-content">
                  <span className="stat-value">{formatNumber(profile?.likes_received || 0)}</span>
                  <span className="stat-label">Likes</span>
                </div>
              </div>
              
              <div className="stat-item">
                <Trophy size={20} />
                <div className="stat-content">
                  <span className="stat-value">{formatNumber(profile?.contribution_score || 0)}</span>
                  <span className="stat-label">Points</span>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="profile-details">
              <h3>Profile Information</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <Mail size={16} />
                  <div className="detail-content">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{profile?.email || 'Not provided'}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <Calendar size={16} />
                  <div className="detail-content">
                    <span className="detail-label">Joined</span>
                    <span className="detail-value">{formatDate(profile?.joined_at)}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <MapPin size={16} />
                  <div className="detail-content">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{profile?.location || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <Globe size={16} />
                  <div className="detail-content">
                    <span className="detail-label">Website</span>
                    <span className="detail-value">{profile?.website || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Badges */}
            {profile?.badges && profile.badges.length > 0 && (
              <div className="profile-badges">
                <h3>Achievements & Badges</h3>
                <div className="badges-grid">
                  {(profile.badges || []).map((badge, index) => (
                    <div
                      key={index}
                      className={`badge ${darkMode ? getBadgeColorDark(badge) : getBadgeColor(badge)}`}
                    >
                      {getBadgeIcon(badge)}
                      <span>{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'activity':
        return (
          <div className="profile-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {(profile?.recent_activity || []).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <MessageCircle size={16} />
                  </div>
                  <div className="activity-content">
                    <p>{activity.description}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              )) || (
                <div className="empty-activity">
                  <BarChart3 size={48} />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'contributions':
        return (
          <div className="profile-contributions">
            <h3>Contributions</h3>
            <div className="contributions-grid">
              <div className="contribution-item">
                <MessageCircle size={24} />
                <div className="contribution-content">
                  <span className="contribution-value">{formatNumber(profile?.questions_count || 0)}</span>
                  <span className="contribution-label">Questions Asked</span>
                </div>
              </div>
              
              <div className="contribution-item">
                <ThumbsUp size={24} />
                <div className="contribution-content">
                  <span className="contribution-value">{formatNumber(profile?.answers_count || 0)}</span>
                  <span className="contribution-label">Answers Given</span>
                </div>
              </div>
              
              <div className="contribution-item">
                <Heart size={24} />
                <div className="contribution-content">
                  <span className="contribution-value">{formatNumber(profile?.likes_received || 0)}</span>
                  <span className="contribution-label">Likes Received</span>
                </div>
              </div>
              
              <div className="contribution-item">
                <Trophy size={24} />
                <div className="contribution-content">
                  <span className="contribution-value">{formatNumber(profile?.contribution_score || 0)}</span>
                  <span className="contribution-label">Contribution Score</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="profile-settings">
            <h3>Profile Settings</h3>
            <div className="settings-list">
              <div className="setting-item">
                <Bell size={20} />
                <div className="setting-content">
                  <span className="setting-label">Email Notifications</span>
                  <span className="setting-description">Receive email notifications for community activity</span>
                </div>
                <div className="setting-toggle">
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
              
              <div className="setting-item">
                <Lock size={20} />
                <div className="setting-content">
                  <span className="setting-label">Privacy Mode</span>
                  <span className="setting-description">Hide your profile from other users</span>
                </div>
                <div className="setting-toggle">
                  <input type="checkbox" />
                </div>
              </div>
              
              <div className="setting-item">
                <Shield size={20} />
                <div className="setting-content">
                  <span className="setting-label">Two-Factor Authentication</span>
                  <span className="setting-description">Add an extra layer of security to your account</span>
                </div>
                <div className="setting-toggle">
                  <input type="checkbox" />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`user-profile ${darkMode ? 'dark' : ''}`}>
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="header-content">
            <User size={24} />
            <h2>My Profile</h2>
            <p>Manage your community profile and settings</p>
          </div>
          
          <div className="header-actions">
            {isEditing ? (
              <div className="edit-actions">
                <button 
                  className="action-btn cancel-btn"
                  onClick={handleCancelEdit}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
                
                <button 
                  className="action-btn save-btn"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading-spinner" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Save</span>
                </button>
              </div>
            ) : (
              <button 
                className="action-btn edit-btn"
                onClick={handleEditToggle}
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Navigation */}
        <div className="profile-navigation">
          <div className="nav-tabs">
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="tab-icon">
                  {tab.icon}
                </div>
                <span className="tab-label">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="tab-content"
            >
              {getTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-message"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
