/**
 * Dashboard Header - Main Header Component
 * ======================================
 * Header component with user info, notifications, and actions.
 * 
 * Features:
 * - User profile display
 * - Notifications
 * - Quick actions
 * - Real-time status
 * - Responsive design
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Settings, 
  RefreshCw, 
  User,
  Wifi,
  WifiOff,
  Clock,
  MoreVertical
} from 'react-feather';
import { formatRelativeTime } from '../Utils/dashboardUtils';
import './DashboardHeader.css';

const DashboardHeader = ({ 
  darkMode, 
  user, 
  onRefresh, 
  lastUpdate, 
  isConnected,
  notifications = [],
  onSettings,
  onNotifications
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get unread notifications count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error refreshing dashboard:', error);
      }
    }
  };

  // Handle notifications toggle
  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
    if (onNotifications) {
      onNotifications(!showNotifications);
    }
  };

  // Handle user menu toggle
  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Handle settings
  const handleSettings = () => {
    if (onSettings) {
      onSettings();
    }
  };

  return (
    <motion.header
      className={`dashboard-header ${darkMode ? 'dark' : ''}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="header-content">
        {/* Left Section - Greeting */}
        <div className="header-left">
          <div className="greeting-section">
            <h1 className="greeting-title">
              Welcome back, {user?.name || 'User'}! 👋
            </h1>
            <p className="greeting-subtitle">
              Here's what's happening with your mental health journey
            </p>
          </div>
        </div>

        {/* Center Section - Status */}
        <div className="header-center">
          <div className="status-indicators">
            {/* Connection Status */}
            <div className={`status-item ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span>{isConnected ? 'Connected' : 'Offline'}</span>
            </div>

            {/* Last Update */}
            {lastUpdate && (
              <div className="status-item">
                <Clock size={16} />
                <span>Updated {formatRelativeTime(lastUpdate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="header-right">
          <div className="header-actions">
            {/* Refresh Button */}
            <motion.button
              className="header-action"
              onClick={handleRefresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh Dashboard"
            >
              <RefreshCw size={18} />
            </motion.button>

            {/* Notifications */}
            <div className="notifications-container">
              <motion.button
                className={`header-action ${unreadCount > 0 ? 'has-notifications' : ''}`}
                onClick={handleNotificationsToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </motion.button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <motion.div
                  className="notifications-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    <button 
                      className="mark-all-read"
                      onClick={() => {/* TODO: Mark all as read */}}
                    >
                      Mark all read
                    </button>
                  </div>
                  
                  <div className="notifications-list">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <div 
                          key={notification.id}
                          className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                        >
                          <div className="notification-content">
                            <h4>{notification.title}</h4>
                            <p>{notification.message}</p>
                            <span className="notification-time">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-notifications">
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="notifications-footer">
                    <button className="view-all-notifications">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Settings */}
            <motion.button
              className="header-action"
              onClick={handleSettings}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Settings"
            >
              <Settings size={18} />
            </motion.button>

            {/* User Menu */}
            <div className="user-menu-container">
              <motion.button
                className="user-button"
                onClick={handleUserMenuToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="user-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <span className="user-name">{user?.name || 'User'}</span>
                <MoreVertical size={16} />
              </motion.button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <motion.div
                  className="user-menu-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="user-menu-item">
                    <User size={16} />
                    <span>Profile</span>
                  </div>
                  <div className="user-menu-item">
                    <Settings size={16} />
                    <span>Settings</span>
                  </div>
                  <div className="user-menu-divider"></div>
                  <div className="user-menu-item logout">
                    <span>Sign Out</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default DashboardHeader;
