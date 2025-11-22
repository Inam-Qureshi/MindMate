import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StartExerciseModal } from './index';

const StartExercisePage = ({ darkMode }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 300);
  };

  const handleComplete = (session) => {
    console.log('Exercise session started:', session);
    // Modal will auto-close and navigate back
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }}>
      <StartExerciseModal
        isOpen={isOpen}
        onClose={handleClose}
        darkMode={darkMode}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default StartExercisePage;

