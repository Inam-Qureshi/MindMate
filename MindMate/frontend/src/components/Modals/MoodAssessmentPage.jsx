import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MoodAssessmentModal } from './index';

const MoodAssessmentPage = ({ darkMode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);
  const sessionIdFromUrl = searchParams.get('session_id');

  const handleClose = () => {
    setIsOpen(false);
    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 300);
  };

  const handleComplete = (metrics) => {
    console.log('Mood assessment completed:', metrics);
    // Modal will auto-close and navigate back
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }}>
      <MoodAssessmentModal
        isOpen={isOpen}
        onClose={handleClose}
        darkMode={darkMode}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default MoodAssessmentPage;

