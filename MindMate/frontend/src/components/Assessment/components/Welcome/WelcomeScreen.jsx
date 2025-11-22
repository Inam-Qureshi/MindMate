import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, Heart } from 'react-feather';
import './WelcomeScreen.css';

const WelcomeScreen = ({
  darkMode = false,
  onStartNewSession
}) => {
  if (!onStartNewSession) {
    console.warn('WelcomeScreen: onStartNewSession prop is required');
    return null;
  }
  return (
    <div className={`welcome-screen ${darkMode ? 'dark' : ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="welcome-content"
      >
        <div className="welcome-icon">
          <FileText size={64} />
        </div>
        <h1 className="welcome-title">Welcome to Assessment</h1>
        <p className="welcome-description">
          Start your mental health assessment to get personalized insights and recommendations.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="welcome-button"
          onClick={onStartNewSession}
        >
          <span>Start New Assessment</span>
          <ArrowRight size={18} />
        </motion.button>
        <div className="welcome-features">
          <div className="feature-item">
            <Heart size={20} />
            <span>Comprehensive Evaluation</span>
          </div>
          <div className="feature-item">
            <Heart size={20} />
            <span>Personalized Insights</span>
          </div>
          <div className="feature-item">
            <Heart size={20} />
            <span>Professional Recommendations</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;

