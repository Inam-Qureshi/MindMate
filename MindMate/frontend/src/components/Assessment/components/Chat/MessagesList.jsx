import React from 'react';
import { AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import './MessagesList.css';

const MessagesList = ({
  darkMode = false,
  messages = [],
  isTyping = false
}) => {
  if (!messages || messages.length === 0 && !isTyping) {
    return (
      <div className="messages-list-empty">
        <p>Start the conversation by sending a message</p>
      </div>
    );
  }

  return (
    <div className="messages-list">
      <AnimatePresence>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || index}
            darkMode={darkMode}
            message={message}
            isUser={message.role === 'user'}
          />
        ))}
      </AnimatePresence>
      {isTyping && <TypingIndicator darkMode={darkMode} />}
    </div>
  );
};

export default MessagesList;

