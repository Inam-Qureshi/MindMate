import { motion } from "framer-motion";
import { useState } from 'react';

const moods = [
  { emoji: '😢', label: 'Awful' },
  { emoji: '😞', label: 'Bad' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😁', label: 'Great' }
];

const MoodTracker = ({ darkMode }) => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    console.log('Mood recorded:', { mood: selectedMood, note });
    // Add your submission logic here
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
      <h3 className="text-lg font-semibold mb-4">How are you feeling today?</h3>
      <div className="flex justify-between mb-4">
        {moods.map((mood, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedMood(mood.label)}
            className={`flex flex-col items-center p-2 rounded-full ${selectedMood === mood.label ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white') : ''}`}
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className="text-xs mt-1">{mood.label}</span>
          </motion.button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Any notes about your mood?"
        className={`w-full p-2 rounded mb-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-100'}`}
        rows={3}
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        disabled={!selectedMood}
        className={`w-full py-2 rounded-md ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white ${!selectedMood ? 'opacity-50' : ''}`}
      >
        Record Mood
      </motion.button>
    </div>
  );
};

export default MoodTracker;