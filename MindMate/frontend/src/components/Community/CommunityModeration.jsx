import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Flag, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Eye, 
  Trash2, 
  Edit3, 
  Ban, 
  Unlock, 
  Lock, 
  User, 
  MessageCircle, 
  ThumbsUp, 
  Clock, 
  Filter, 
  Search, 
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  BarChart3
} from 'react-feather';

const CommunityModeration = ({ 
  moderation, 
  onModerationAction,
  userType,
  darkMode 
}) => {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [moderationLog, setModerationLog] = useState([]);
  const [moderationStats, setModerationStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'reports', label: 'Reports', icon: <Flag size={18} />, count: 0 },
    { id: 'moderation', label: 'Moderation', icon: <Shield size={18} />, count: 0 },
    { id: 'users', label: 'Users', icon: <Users size={18} />, count: 0 },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, count: 0 }
  ];

  const reportTypes = [
    { value: 'all', label: 'All Reports' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'other', label: 'Other' }
  ];

  const moderationActions = [
    { value: 'approve', label: 'Approve', icon: <CheckCircle size={16} />, color: 'green' },
    { value: 'reject', label: 'Reject', icon: <X size={16} />, color: 'red' },
    { value: 'warn', label: 'Warn User', icon: <AlertCircle size={16} />, color: 'yellow' },
    { value: 'delete', label: 'Delete Content', icon: <Trash2 size={16} />, color: 'red' },
    { value: 'ban', label: 'Ban User', icon: <Ban size={16} />, color: 'red' },
    { value: 'mute', label: 'Mute User', icon: <Lock size={16} />, color: 'orange' }
  ];

  const getReportIcon = (type) => {
    switch (type) {
      case 'spam':
        return <Flag size={16} />;
      case 'harassment':
        return <AlertCircle size={16} />;
      case 'inappropriate':
        return <X size={16} />;
      case 'misinformation':
        return <AlertCircle size={16} />;
      default:
        return <Flag size={16} />;
    }
  };

  const getReportColor = (type) => {
    switch (type) {
      case 'spam':
        return 'text-yellow-600 bg-yellow-100';
      case 'harassment':
        return 'text-red-600 bg-red-100';
      case 'inappropriate':
        return 'text-orange-600 bg-orange-100';
      case 'misinformation':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReportColorDark = (type) => {
    switch (type) {
      case 'spam':
        return 'text-yellow-400 bg-yellow-900';
      case 'harassment':
        return 'text-red-400 bg-red-900';
      case 'inappropriate':
        return 'text-orange-400 bg-orange-900';
      case 'misinformation':
        return 'text-purple-400 bg-purple-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'approve':
        return 'text-green-600 bg-green-100';
      case 'reject':
        return 'text-red-600 bg-red-100';
      case 'warn':
        return 'text-yellow-600 bg-yellow-100';
      case 'delete':
        return 'text-red-600 bg-red-100';
      case 'ban':
        return 'text-red-600 bg-red-100';
      case 'mute':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColorDark = (action) => {
    switch (action) {
      case 'approve':
        return 'text-green-400 bg-green-900';
      case 'reject':
        return 'text-red-400 bg-red-900';
      case 'warn':
        return 'text-yellow-400 bg-yellow-900';
      case 'delete':
        return 'text-red-400 bg-red-900';
      case 'ban':
        return 'text-red-400 bg-red-900';
      case 'mute':
        return 'text-orange-400 bg-orange-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleModerationAction = async (action, targetId, data) => {
    try {
      setLoading(true);
      await onModerationAction(action, targetId, data);
      
      // Refresh data after action
      fetchModerationData();
    } catch (error) {
      console.error('Error performing moderation action:', error);
      setError('Failed to perform moderation action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      // This would fetch from backend
      // const response = await axios.get('/api/forum/moderation/data');
      // setReports(response.data.reports);
      // setModerationLog(response.data.log);
      // setModerationStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching moderation data:', error);
      setError('Failed to load moderation data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  if (userType !== 'admin' && userType !== 'moderator') {
    return (
      <div className="moderation-access-denied">
        <Shield size={48} />
        <h3>Access Denied</h3>
        <p>You don't have permission to access moderation tools.</p>
      </div>
    );
  }

  return (
    <div className={`community-moderation ${darkMode ? 'dark' : ''}`}>
      <div className="moderation-container">
        {/* Moderation Header */}
        <div className="moderation-header">
          <div className="header-content">
            <Shield size={24} />
            <h2>Community Moderation</h2>
            <p>Manage community content and user behavior</p>
          </div>
        </div>

        {/* Moderation Navigation */}
        <div className="moderation-navigation">
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
                <div className="tab-content">
                  <span className="tab-label">{tab.label}</span>
                  <span className="tab-count">{tab.count}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Moderation Content */}
        <div className="moderation-content">
          {activeTab === 'reports' && (
            <div className="reports-section">
              <div className="section-header">
                <h3>Content Reports</h3>
                <div className="section-actions">
                  <select className="filter-select">
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="reports-list">
                {loading ? (
                  <div className="loading-container">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="report-skeleton">
                        <div className="skeleton-avatar" />
                        <div className="skeleton-content">
                          <div className="skeleton-text" />
                          <div className="skeleton-time" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="empty-reports">
                    <Flag size={48} />
                    <h3>No Reports</h3>
                    <p>No content reports to review</p>
                  </div>
                ) : (
                  reports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      className="report-item"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      <div className="report-header">
                        <div className="report-info">
                          <div className="report-icon">
                            <div className={`icon-wrapper ${darkMode ? getReportColorDark(report.type) : getReportColor(report.type)}`}>
                              {getReportIcon(report.type)}
                            </div>
                          </div>
                          
                          <div className="report-details">
                            <div className="report-title">
                              <h4>{report.title}</h4>
                              <span className={`report-type ${darkMode ? getReportColorDark(report.type) : getReportColor(report.type)}`}>
                                {report.type}
                              </span>
                            </div>
                            
                            <div className="report-meta">
                              <div className="report-user">
                                <User size={14} />
                                <span>Reported by {report.reporter_name}</span>
                              </div>
                              <div className="report-time">
                                <Clock size={14} />
                                <span>{formatTimeAgo(report.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="report-actions">
                          {moderationActions.map(action => (
                            <button
                              key={action.value}
                              className={`action-btn ${action.color}`}
                              onClick={() => handleModerationAction(action.value, report.id, {})}
                            >
                              {action.icon}
                              <span>{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="report-content">
                        <p>{report.description}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="moderation-section">
              <div className="section-header">
                <h3>Moderation Log</h3>
                <div className="section-actions">
                  <button className="action-btn">
                    <Filter size={16} />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
              
              <div className="moderation-log">
                {loading ? (
                  <div className="loading-container">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="log-skeleton">
                        <div className="skeleton-avatar" />
                        <div className="skeleton-content">
                          <div className="skeleton-text" />
                          <div className="skeleton-time" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : moderationLog.length === 0 ? (
                  <div className="empty-log">
                    <Shield size={48} />
                    <h3>No Moderation Actions</h3>
                    <p>No moderation actions have been taken yet</p>
                  </div>
                ) : (
                  moderationLog.map((log, index) => (
                    <motion.div
                      key={log.id}
                      className="log-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="log-icon">
                        <div className={`icon-wrapper ${darkMode ? getActionColorDark(log.action) : getActionColor(log.action)}`}>
                          {moderationActions.find(a => a.value === log.action)?.icon}
                        </div>
                      </div>
                      
                      <div className="log-content">
                        <div className="log-header">
                          <span className="log-action">{log.action}</span>
                          <span className="log-time">{formatTimeAgo(log.created_at)}</span>
                        </div>
                        
                        <div className="log-description">
                          <p>{log.description}</p>
                        </div>
                        
                        <div className="log-meta">
                          <span>By {log.moderator_name}</span>
                          <span>•</span>
                          <span>Target: {log.target_type}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-section">
              <div className="section-header">
                <h3>User Management</h3>
                <div className="section-actions">
                  <button className="action-btn">
                    <Search size={16} />
                    <span>Search Users</span>
                  </button>
                </div>
              </div>
              
              <div className="users-list">
                <div className="empty-users">
                  <Users size={48} />
                  <h3>User Management</h3>
                  <p>User management features will be available here</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <div className="section-header">
                <h3>Moderation Analytics</h3>
                <div className="section-actions">
                  <button className="action-btn">
                    <BarChart3 size={16} />
                    <span>Export Data</span>
                  </button>
                </div>
              </div>
              
              <div className="analytics-content">
                <div className="empty-analytics">
                  <BarChart3 size={48} />
                  <h3>Moderation Analytics</h3>
                  <p>Analytics and insights will be available here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityModeration;
