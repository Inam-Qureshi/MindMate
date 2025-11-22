import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JournalEntryModal } from './index';

const JournalEntryPage = ({ darkMode }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 300);
  };

  const handleComplete = (entry) => {
    console.log('Journal entry saved:', entry);
    // Modal will auto-close and navigate back
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }}>
      <JournalEntryModal
        isOpen={isOpen}
        onClose={handleClose}
        darkMode={darkMode}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default JournalEntryPage;

