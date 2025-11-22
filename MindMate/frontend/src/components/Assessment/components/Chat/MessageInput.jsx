import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'react-feather';
import './MessageInput.css';

const MessageInput = ({
  darkMode = false,
  onSendMessage,
  disabled = false
}) => {
  if (!onSendMessage) {
    console.warn('MessageInput: onSendMessage prop is required');
    return null;
  }
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`message-input-container ${darkMode ? 'dark' : ''}`}>
      <form onSubmit={handleSubmit} className="message-input-form">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Message MindMate..."
          disabled={disabled}
          className="message-input"
          rows={1}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="message-send-button"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;

