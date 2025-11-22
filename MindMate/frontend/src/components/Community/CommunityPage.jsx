import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageCircle, 
  TrendingUp, 
  Award, 
  Star, 
  Heart, 
  Clock, 
  Eye, 
  ThumbsUp, 
  Bookmark, 
  Flag, 
  Edit3, 
  Trash2, 
  MoreVertical,
  ChevronDown, 
  ChevronUp, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Grid, 
  List,
  HelpCircle,
  ThumbsDown,
  Shield,
  Zap,
  Sun,
  Moon,
  User,
  Calendar,
  Tag,
  Activity,
  BarChart3,
  Target,
  Trophy,
  Crown,
  Sparkles
} from 'react-feather';
import CommunityHeader from './CommunityHeader';
import CommunityStats from './CommunityStats';
import TopContributors from './TopContributors';
import RecentActivity from './RecentActivity';
import CommunityGuidelines from './CommunityGuidelines';
import CommunityModeration from './CommunityModeration';
import UserProfile from './UserProfile';
import UserActivity from './UserActivity';
import UserReputation from './UserReputation';
import UserContributions from './UserContributions';
import UserSettings from './UserSettings';
import CommunityAnalytics from './CommunityAnalytics';
import forumAPI from '../../utils/forumApi';

const CommunityPage = ({ darkMode }) => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [communityData, setCommunityData] = useState({
    stats: {},
    topContributors: [],
    recentActivity: [],
    guidelines: [],
    moderation: {}
  });
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userType, setUserType] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Community Overview', icon: <Users size={18} />, description: 'Community statistics and activity' },
    { id: 'contributors', label: 'Top Contributors', icon: <Trophy size={18} />, description: 'Most active community members' },
    { id: 'activity', label: 'Recent Activity', icon: <Activity size={18} />, description: 'Latest community activity' },
    { id: 'guidelines', label: 'Community Guidelines', icon: <Shield size={18} />, description: 'Community rules and guidelines' },
    { id: 'moderation', label: 'Moderation', icon: <Flag size={18} />, description: 'Content moderation tools' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, description: 'Community insights and analytics' },
    { id: 'profile', label: 'My Profile', icon: <User size={18} />, description: 'Your community profile' },
    { id: 'settings', label: 'Settings', icon: <Edit3 size={18} />, description: 'Profile and notification settings' }
  ];

  // Initialize component
  useEffect(() => {
    fetchUserInfo();
    fetchCommunityData();
  }, []);

  // Fetch user information
  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setUserType(response.data.user_type);
        setCurrentUserId(response.data.id);
        fetchUserProfile(response.data.id);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (userId) => {
    try {
      const response = await forumAPI.getUserProfile(userId);

      if (response) {
        setUserProfile(response);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch community data
  const fetchCommunityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch community stats
      const statsResponse = await forumAPI.getStats();
      
      // Fetch top contributors
      const contributorsResponse = await forumAPI.getTopContributors();
      
      // Fetch recent activity
      const activityResponse = await forumAPI.getRecentActivity();

      setCommunityData({
        stats: statsResponse || {},
        topContributors: contributorsResponse || [],
        recentActivity: activityResponse || [],
        guidelines: [], // This would come from a guidelines endpoint
        moderation: {} // This would come from a moderation endpoint
      });
    } catch (error) {
      console.error('Error fetching community data:', error);
      setError('Failed to load community data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Handle user profile update
  const handleUserProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile);
  };

  // Handle user settings update
  const handleUserSettingsUpdate = (updatedSettings) => {
    // Update user settings
    console.log('User settings updated:', updatedSettings);
  };

  // Handle moderation action
  const handleModerationAction = async (action, targetId, data) => {
    try {
      const response = await forumAPI.performModerationAction(action, targetId, data);

      if (response.success) {
        // Refresh community data
        fetchCommunityData();
      }
    } catch (error) {
      console.error('Error performing moderation action:', error);
      setError('Failed to perform moderation action. Please try again.');
    }
  };

  // Get tab content
  const getTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="overview-content">
            <CommunityStats 
              stats={communityData.stats}
              loading={loading}
              darkMode={darkMode}
            />
            <div className="overview-grid">
              <TopContributors 
                contributors={communityData.topContributors}
                loading={loading}
                darkMode={darkMode}
              />
              <RecentActivity 
                activity={communityData.recentActivity}
                loading={loading}
                darkMode={darkMode}
              />
            </div>
          </div>
        );

      case 'contributors':
        return (
          <TopContributors 
            contributors={communityData.topContributors}
            loading={loading}
            showFullList={true}
            darkMode={darkMode}
          />
        );

      case 'activity':
        return (
          <RecentActivity 
            activity={communityData.recentActivity}
            loading={loading}
            showFullList={true}
            darkMode={darkMode}
          />
        );

      case 'guidelines':
        return (
          <CommunityGuidelines 
            guidelines={communityData.guidelines}
            darkMode={darkMode}
          />
        );

      case 'moderation':
        return (
          <CommunityModeration 
            moderation={communityData.moderation}
            onModerationAction={handleModerationAction}
            userType={userType}
            darkMode={darkMode}
          />
        );

      case 'analytics':
        return (
          <CommunityAnalytics 
            stats={communityData.stats}
            contributors={communityData.topContributors}
            activity={communityData.recentActivity}
            darkMode={darkMode}
          />
        );

      case 'profile':
        return (
          <UserProfile 
            profile={userProfile}
            onProfileUpdate={handleUserProfileUpdate}
            currentUserId={currentUserId}
            darkMode={darkMode}
          />
        );

      case 'settings':
        return (
          <UserSettings 
            settings={userProfile?.settings}
            onSettingsUpdate={handleUserSettingsUpdate}
            darkMode={darkMode}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`community-page ${darkMode ? 'dark' : ''}`}>
      <div className="community-container">
        {/* Community Header */}
        <CommunityHeader
          stats={communityData.stats}
          loading={loading}
          darkMode={darkMode}
        />

        {/* Community Navigation */}
        <div className="community-navigation">
          <div className="nav-container">
            <div className="nav-tabs">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="tab-icon">
                    {tab.icon}
                  </div>
                  <div className="tab-content">
                    <span className="tab-label">{tab.label}</span>
                    <span className="tab-description">{tab.description}</span>
                  </div>
                  
                  {activeTab === tab.id && (
                    <motion.div
                      className="tab-indicator"
                      layoutId="activeTab"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Community Content */}
        <div className="community-content">
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

export default CommunityPage;
