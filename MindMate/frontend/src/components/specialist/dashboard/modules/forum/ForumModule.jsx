import React, { useState } from 'react';
import { MessageSquare } from 'react-feather';
import ForumQuestionsList from './ForumQuestionsList';
import QuestionDetail from './QuestionDetail';
import MyAnswers from './MyAnswers';
import ForumStats from './ForumStats';
import EmptyState from '../../shared/EmptyState';

const ForumModule = ({ darkMode, activeSidebarItem = 'questions' }) => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const handleQuestionSelect = (question) => {
    setSelectedQuestion(question);
  };

  const handleBackToQuestions = () => {
    setSelectedQuestion(null);
  };

  // If a question is selected, show detail view
  if (selectedQuestion) {
    return (
      <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <QuestionDetail
          questionId={selectedQuestion.id}
          darkMode={darkMode}
          onBack={handleBackToQuestions}
        />
      </div>
    );
  }

  // Render based on sidebar item
  switch (activeSidebarItem) {
    case 'questions':
      return (
        <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <div className="mb-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Community Questions
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Browse and answer questions from the community
            </p>
          </div>
          <ForumQuestionsList
            darkMode={darkMode}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>
      );

    case 'my_answers':
      return (
        <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <div className="mb-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              My Answers
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              View your contributions and answers to questions
            </p>
          </div>
          <MyAnswers
            darkMode={darkMode}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>
      );

    case 'moderation':
      return (
        <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <div className="mb-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Moderation Queue
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Review flagged content and moderate discussions
            </p>
          </div>
          <EmptyState
            icon={MessageSquare}
            title="Moderation Access"
            message="Moderation features are available to administrators only. If you need to report content, please contact support."
          />
        </div>
      );

    case 'stats':
      return (
        <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <ForumStats darkMode={darkMode} />
        </div>
      );

    default:
      return (
        <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <div className="mb-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Forum
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Community questions and answers
            </p>
          </div>
          <ForumQuestionsList
            darkMode={darkMode}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>
      );
  }
};

export default ForumModule;

