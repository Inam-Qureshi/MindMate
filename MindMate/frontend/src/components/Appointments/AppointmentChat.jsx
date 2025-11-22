import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  Mic, 
  MicOff,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageCircle,
  FileText,
  Image,
  Download
} from 'react-feather';
import axios from 'axios';
import { API_URL } from '../../config/api';

const AppointmentChat = ({ 
  appointment, 
  session, 
  darkMode, 
  onClose,
  onEndSession,
  userType = 'patient' // 'patient' or 'specialist'
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load session messages
  useEffect(() => {
    if (session?.id) {
      loadMessages();
    }
  }, [session?.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      const response = await axios.get(
        `${API_URL}/api/appointments/sessions/${session.id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setMessages(response.data.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      
      const response = await axios.post(
        `${API_URL}/api/appointments/sessions/${session.id}/messages`,
        {
          content: newMessage.trim(),
          message_type: 'text'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        setIsTyping(false);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Handle typing indicator
    if (value && !isTyping) {
      setIsTyping(true);
      // Send typing indicator to other user
      // This would be implemented with WebSocket in a real-time system
    }
    
    // Clear typing indicator after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getMessageIcon = (messageType) => {
    switch (messageType) {
      case 'text':
        return <MessageCircle className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'file':
        return <FileText className="w-4 h-4" />;
      case 'system':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const handleEndSession = async () => {
    if (userType === 'specialist' && onEndSession) {
      try {
        await onEndSession(appointment);
        onClose?.();
      } catch (err) {
        console.error('Error ending session:', err);
        setError('Failed to end session');
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${
      darkMode ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            darkMode ? 'bg-blue-600' : 'bg-blue-100'
          }`}>
            <MessageCircle className={`w-5 h-5 ${
              darkMode ? 'text-blue-300' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className={`font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Session Chat
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {userType === 'patient' ? appointment?.specialist_name : appointment?.patient_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Session Controls */}
          {userType === 'specialist' && (
            <button
              onClick={handleEndSession}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>End Session</span>
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <MessageCircle className={`w-12 h-12 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`mt-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender_type === userType;
            const showDate = index === 0 || 
              formatDate(messages[index - 1].sent_at) !== formatDate(message.sent_at);
            
            return (
              <div key={message.id}>
                {/* Date Separator */}
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {formatDate(message.sent_at)}
                    </span>
                  </div>
                )}
                
                {/* Message */}
                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                    isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isOwnMessage 
                        ? darkMode ? 'bg-blue-600' : 'bg-blue-500'
                        : darkMode ? 'bg-gray-600' : 'bg-gray-400'
                    }`}>
                      <User className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Message Content */}
                    <div className={`px-3 py-2 rounded-lg ${
                      isOwnMessage
                        ? darkMode 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-blue-500 text-white'
                        : darkMode 
                          ? 'bg-gray-700 text-gray-200' 
                          : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        {getMessageIcon(message.message_type)}
                        <span className="text-xs opacity-75">
                          {formatTime(message.sent_at)}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Message Status */}
                      {isOwnMessage && (
                        <div className="flex justify-end mt-1">
                          {message.read_at ? (
                            <CheckCircle className="w-3 h-3 text-blue-200" />
                          ) : (
                            <Clock className="w-3 h-3 text-blue-200" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {userType === 'patient' ? appointment?.specialist_name : appointment?.patient_name} is typing...
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mx-4 mb-2 p-3 rounded-lg ${
          darkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className={`p-4 border-t ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type your message..."
              disabled={sending}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`p-2 rounded-lg transition-colors ${
              !newMessage.trim() || sending
                ? darkMode
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppointmentChat;
