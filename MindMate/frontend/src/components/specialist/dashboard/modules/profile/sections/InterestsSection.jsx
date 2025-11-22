import React from 'react';
import { Heart } from 'react-feather';

const InterestsSection = ({ darkMode, data }) => {
  const interests = data.interests || [];

  if (!interests || interests.length === 0) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Heart className="h-5 w-5" />
        <span>Interests</span>
      </h2>

      <div className="flex flex-wrap gap-2">
        {interests.map((interest, idx) => (
          <span
            key={idx}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              darkMode
                ? 'bg-pink-900 text-pink-300 border border-pink-700'
                : 'bg-pink-100 text-pink-700 border border-pink-200'
            }`}
          >
            {interest}
          </span>
        ))}
      </div>
    </div>
  );
};

export default InterestsSection;

