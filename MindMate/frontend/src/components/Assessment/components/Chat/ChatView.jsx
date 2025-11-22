import React, { useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessagesList from './MessagesList';
import MessageInput from './MessageInput';
import './ChatView.css';

const ChatView = ({
  darkMode = false,
  session = null,
  messages = [],
  isTyping = false,
  progress = 0,
  progressDetails = null,
  currentModule = null,
  symptomSummary = null,
  isComplete = false,
  onSendMessage,
  onViewResults
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className={`chat-view ${darkMode ? 'dark' : ''}`}>
      <ChatHeader
        darkMode={darkMode}
        session={session}
        currentModule={currentModule}
        progress={progress}
        progressDetails={progressDetails}
        symptomSummary={symptomSummary}
        isComplete={isComplete}
        onViewResults={onViewResults}
      />

      <div className="chat-messages-container">
        <MessagesList
          darkMode={darkMode}
          messages={messages}
          isTyping={isTyping}
        />
        <div ref={messagesEndRef} />
      </div>

      {!isComplete && (
        <MessageInput
          darkMode={darkMode}
          onSendMessage={onSendMessage}
          disabled={isTyping}
        />
      )}

      {isComplete && (
        <div className="chat-complete-message">
          <p>Assessment completed! Click "View Results" to see your report.</p>
        </div>
      )}
    </div>
  );
};

export default ChatView;

