import React, { useState, useEffect } from 'react';
import { Save, X } from 'react-feather';

const InterestsForm = ({ darkMode, data, onSave, onDirty, saving }) => {
  const [interests, setInterests] = useState([]);
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    if (data) {
      setInterests(data.interests || []);
    }
  }, [data]);

  const handleAddInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests(prev => [...prev, interestInput.trim()]);
      setInterestInput('');
      onDirty();
    }
  };

  const handleRemoveInterest = (interest) => {
    setInterests(prev => prev.filter(i => i !== interest));
    onDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave({ interests });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Interests
        </label>
        <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Add topics or areas you're passionate about
        </p>

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {interests.map((interest, idx) => (
              <span
                key={idx}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm ${
                  darkMode
                    ? 'bg-pink-900 text-pink-300 border border-pink-700'
                    : 'bg-pink-100 text-pink-700 border border-pink-200'
                }`}
              >
                <span>{interest}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(interest)}
                  className={`ml-1 ${darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-pink-600 hover:text-pink-800'}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex space-x-2">
          <input
            type="text"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
            placeholder="Add interest (press Enter)"
            className={`flex-1 px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
          <button
            type="button"
            onClick={handleAddInterest}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
            saving
              ? 'bg-emerald-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default InterestsForm;

