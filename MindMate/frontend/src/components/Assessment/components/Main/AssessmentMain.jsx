import React from 'react';
import WelcomeScreen from '../Welcome/WelcomeScreen';
import ChatView from '../Chat/ChatView';
import ResultsView from '../Results/ResultsView';
import './AssessmentMain.css';

const AssessmentMain = ({
  darkMode = false,
  currentSession = null,
  messages = [],
  isTyping = false,
  progress = 0,
  progressDetails = null,
  currentModule = null,
  symptomSummary = null,
  isComplete = false,
  onStartNewSession,
  onSendMessage,
  onViewResults
}) => {
  // Safety check for required handlers
  if (!onStartNewSession) {
    console.warn('AssessmentMain: onStartNewSession prop is required');
  }
  // Show results if assessment is complete
  if (currentSession && isComplete) {
    return (
      <ResultsView
        darkMode={darkMode}
        session={currentSession}
        progressDetails={progressDetails}
        symptomSummary={symptomSummary}
        onViewResults={onViewResults}
      />
    );
  }

  // Show chat if session is active
  if (currentSession) {
    return (
      <ChatView
        darkMode={darkMode}
        session={currentSession}
        messages={messages}
        isTyping={isTyping}
        progress={progress}
      progressDetails={progressDetails}
        currentModule={currentModule}
      symptomSummary={symptomSummary}
        isComplete={isComplete}
        onSendMessage={onSendMessage}
        onViewResults={onViewResults}
      />
    );
  }

  // Show welcome screen if no session
  return (
    <WelcomeScreen
      darkMode={darkMode}
      onStartNewSession={onStartNewSession}
    />
  );
};

export default AssessmentMain;

