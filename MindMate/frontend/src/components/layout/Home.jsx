import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Plus, Sun, Moon, Activity, BookOpen, Heart,User, LogOut, Settings } from 'react-feather';
import ProfileDropdown from '../Home/Navigation/ProfileDropdown';

const Home = () => {

  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef(null);

  // Sample AI therapist initial message
  useEffect(() => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm MindMate, your AI mental health companion. How are you feeling today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    // Add user message
    const userMsg = {
      id: messages.length + 1,
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([...messages, userMsg]);
    setNewMessage('');

    // Simulate AI response after delay
    setTimeout(() => {
      const aiResponses = [
        "I hear you. Can you tell me more about that feeling?",
        "That sounds challenging. How long have you felt this way?",
        "I appreciate you sharing that. What would help you feel better?",
        "Let's explore that together. What's been on your mind lately?",
        "I understand. Would you like to try a breathing exercise to help?"
      ];
      const aiMsg = {
        id: messages.length + 2,
        text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000 + Math.random() * 2000);
  };

  const startNewSession = () => {
    setSessionStarted(true);
    setMessages([
      {
        id: 1,
        text: "Welcome to your new session. I'm here to listen. What would you like to talk about today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md py-4 px-6 flex justify-between items-center`}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            M
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            MindMate
          </h1>
        </motion.div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ProfileDropdown darkMode={darkMode} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}
        >
          <div className="p-4 border-b dark:border-gray-700">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startNewSession}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
            >
              <Plus size={16} />
              <span>New Session</span>
            </motion.button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2">
            {['Today', 'Yesterday', 'Previous Week'].map((day, i) => (
              <div key={i} className="mb-4">
                <h3 className={`text-xs font-semibold px-2 py-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{day}</h3>
                {[1, 2, 3].map((session) => (
                  <motion.div
                    whileHover={{ x: 5 }}
                    key={session}
                    className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${activeTab === `session-${session}` ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                    onClick={() => setActiveTab(`session-${session}`)}
                  >
                    <MessageSquare size={16} className="mr-2 flex-shrink-0" />
                    <div className="truncate">Session {session} - {day}</div>
                  </motion.div>
                ))}
              </div>
            ))}
          </nav>

          <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                <Settings size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
              </div>
              <div>
                <div className="text-sm font-medium">Settings</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Preferences</div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex space-x-1">
              {['chat', 'mood', 'resources', 'exercises'].map((tab) => (
                <motion.button
                  key={tab}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${activeTab === tab ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </motion.button>
              ))}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {sessionStarted ? 'Session Active' : 'Ready to Begin'}
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${message.sender === 'user' 
                            ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white') 
                            : (darkMode ? 'bg-gray-700' : 'bg-gray-200')}`}
                        >
                          {message.text}
                          <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </AnimatePresence>
                </div>

                {/* Message Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
                >
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className={`flex-1 px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-400'}`}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={`px-4 py-2 rounded-md font-medium ${!newMessage.trim() 
                        ? (darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500') 
                        : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white`}
                    >
                      Send
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'mood' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <h2 className="text-2xl font-bold mb-6">How are you feeling today?</h2>
                <div className="grid grid-cols-5 gap-4 mb-8">
                  {['😢', '😞', '😐', '😊', '😁'].map((emoji, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.2, y: -10 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-4xl cursor-pointer p-4 rounded-full hover:bg-opacity-20 hover:bg-gray-500"
                    >
                      {emoji}
                    </motion.div>
                  ))}
                </div>
                <textarea
                  placeholder="Optional: Describe your mood..."
                  className={`w-full max-w-md px-4 py-3 rounded-lg mb-4 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                  rows={4}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-6 py-3 rounded-md font-medium ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                >
                  Track My Mood
                </motion.button>
              </motion.div>
            )}

            {activeTab === 'resources' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[
                  { icon: <BookOpen size={24} />, title: "Anxiety Guide", desc: "Learn coping mechanisms" },
                  { icon: <Activity size={24} />, title: "Sleep Better", desc: "Improve your sleep quality" },
                  { icon: <Heart size={24} />, title: "Self-Care", desc: "Daily self-care practices" },
                  { icon: <BookOpen size={24} />, title: "Mindfulness", desc: "Beginner's guide" },
                  { icon: <Activity size={24} />, title: "Stress Relief", desc: "Quick techniques" },
                  { icon: <Heart size={24} />, title: "Relationships", desc: "Healthy communication" }
                ].map((resource, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -5 }}
                    className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-md cursor-pointer`}
                  >
                    <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-blue-100'} flex items-center justify-center mb-4`}>
                      {resource.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{resource.title}</h3>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{resource.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'exercises' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <h2 className="text-2xl font-bold mb-8">Therapeutic Exercises</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  {[
                    { title: "Breathing Exercise", duration: "5 min", color: "from-blue-400 to-blue-600" },
                    { title: "Body Scan", duration: "10 min", color: "from-purple-400 to-purple-600" },
                    { title: "Gratitude Journal", duration: "7 min", color: "from-green-400 to-green-600" },
                    { title: "Progressive Relaxation", duration: "12 min", color: "from-orange-400 to-orange-600" }
                  ].map((exercise, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.03 }}
                      className={`bg-gradient-to-r ${exercise.color} p-6 rounded-xl text-white cursor-pointer`}
                    >
                      <h3 className="text-xl font-bold mb-2">{exercise.title}</h3>
                      <p className="opacity-80 mb-4">{exercise.duration}</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-white bg-opacity-20 rounded-md backdrop-blur-sm"
                      >
                        Start
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;