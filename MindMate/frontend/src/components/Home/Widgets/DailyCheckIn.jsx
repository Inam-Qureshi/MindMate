import { motion } from "framer-motion";
import { useState } from 'react';

const DailyCheckIn = ({ darkMode }) => {
  const [answers, setAnswers] = useState({
    sleptWell: null,
    exercised: null,
    ateWell: null
  });

  const questions = [
    { id: 'sleptWell', text: 'Did you sleep well last night?' },
    { id: 'exercised', text: 'Did you exercise today?' },
    { id: 'ateWell', text: 'Did you eat well today?' }
  ];

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
      <h3 className="text-lg font-semibold mb-4">Daily Check-In</h3>
      <div className="space-y-4">
        {questions.map((question) => (
          <div key={question.id}>
            <p className="mb-2">{question.text}</p>
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswer(question.id, true)}
                className={`px-4 py-1 rounded-md ${answers[question.id] === true ? (darkMode ? 'bg-green-600' : 'bg-green-500 text-white') : (darkMode ? 'bg-gray-600' : 'bg-gray-200')}`}
              >
                Yes
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswer(question.id, false)}
                className={`px-4 py-1 rounded-md ${answers[question.id] === false ? (darkMode ? 'bg-red-600' : 'bg-red-500 text-white') : (darkMode ? 'bg-gray-600' : 'bg-gray-200')}`}
              >
                No
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyCheckIn;