import React from 'react';
import { motion } from 'framer-motion';

const ForumNavigation = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  tabCounts, 
  darkMode 
}) => {
  const handleTabClick = (tabId) => {
    onTabChange(tabId);
  };

  return (
    <div className={`forum-navigation ${darkMode ? 'dark' : ''}`}>
      <div className="navigation-container">
        <div className="nav-tabs">
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
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
                <span className="tab-count">{tabCounts[tab.id] || 0}</span>
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
        
        {/* Navigation Actions */}
        <div className="nav-actions">
          <motion.button
            className="nav-action-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Recent</span>
          </motion.button>
          
          <motion.button
            className="nav-action-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Popular</span>
          </motion.button>
          
          <motion.button
            className="nav-action-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Trending</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ForumNavigation;
