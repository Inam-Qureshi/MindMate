import React from 'react';
import { motion } from 'framer-motion';
import './TypingIndicator.css';

const TypingIndicator = ({ darkMode = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`typing-indicator ${darkMode ? 'dark' : ''}`}
    >
      <div className="typing-indicator-content">
        <div className="typing-avatar">
          <span className="avatar-text">M</span>
        </div>
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;

