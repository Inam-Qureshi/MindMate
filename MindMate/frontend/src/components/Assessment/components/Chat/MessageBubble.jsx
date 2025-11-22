import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'react-feather';
import './MessageBubble.css';

const MessageBubble = ({
  darkMode = false,
  message = {},
  isUser = false
}) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  };

  const content = message?.content || message?.text || message?.message || 'No content available';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`message-bubble ${isUser ? 'user' : 'assistant'} ${darkMode ? 'dark' : ''}`}
    >
      <div className="message-bubble-content">
        <div className="message-avatar">
          {isUser ? (
            <User size={16} />
          ) : (
            <span className="avatar-text">M</span>
          )}
        </div>
        <div className="message-text-container">
          <div className="message-text">
            {content}
          </div>
          {message.timestamp && (
            <div className="message-timestamp">
              {formatTime(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;

