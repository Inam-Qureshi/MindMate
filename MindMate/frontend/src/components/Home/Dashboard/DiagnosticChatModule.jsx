import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Mic, Send, MessageSquare, Clipboard, Activity, Heart } from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const DiagnosticChatModule = ({ darkMode, sessionId, onSessionUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [diagnosticSessionId, setDiagnosticSessionId] = useState(null);
  const [currentPhase, setCurrentPhase] = useState("TRIAGE");
  const [questionCount, setQuestionCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [showPhaseIndicator, setShowPhaseIndicator] = useState(true);
  const messagesEndRef = useRef(null);
  const showSendButton = newMessage.trim() !== "";

  // Phase information for UI display
  const phaseInfo = {
    TRIAGE: { name: "Initial Assessment", color: "bg-blue-500", description: "Understanding your concerns" },
    EXPLORATION: { name: "Exploration", color: "bg-green-500", description: "Exploring your symptoms" },
    PROBING: { name: "Detailed Assessment", color: "bg-yellow-500", description: "Deep dive into specific areas" },
    CONCLUSION: { name: "Summary", color: "bg-purple-500", description: "Reviewing findings" }
  };

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setDiagnosticSessionId(null);
      return;
    }

    // Start diagnostic conversation when component mounts
    startDiagnosticConversation();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const startDiagnosticConversation = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.post(
        `${API_URL}${API_ENDPOINTS.CHAT.START}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data?.response) {
        setDiagnosticSessionId(data.session_id);
        setCurrentPhase(data.phase || "TRIAGE");
        setQuestionCount(data.question_count || 0);
        setIsComplete(data.is_complete || false);

        // Add personalized greeting message
        const greetingMsg = {
          id: Date.now(),
          text: data.response,
          sender: "ai",
          timestamp: new Date().toISOString(),
          phase: data.phase,
          isGreeting: true
        };
        setMessages([greetingMsg]);
      }
    } catch (error) {
      console.error("Failed to start diagnostic conversation:", error);
      // Add fallback greeting
      const fallbackMsg = {
        id: Date.now(),
        text: "Hello! Welcome to MindMate. How are you doing today?",
        sender: "ai",
        timestamp: new Date().toISOString(),
        isGreeting: true
      };
      setMessages([fallbackMsg]);
    }
  };

  const handleSendMessage = async () => {
    if (!showSendButton || !diagnosticSessionId) return;

    const userMsg = {
      id: Date.now(),
      text: newMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.post(
        `${API_URL}${API_ENDPOINTS.CHAT.MESSAGE}`,
        {
          message: userMsg.text,
          session_id: diagnosticSessionId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update state with response data
      if (data?.response) {
        const aiMsg = {
          id: Date.now() + 1,
          text: data.response,
          sender: "ai",
          timestamp: new Date().toISOString(),
          phase: data.phase,
        };
        setMessages((prev) => [...prev, aiMsg]);
        
        // Update phase and progress
        setCurrentPhase(data.phase || currentPhase);
        setQuestionCount(data.question_count || questionCount);
        setIsComplete(data.is_complete || false);
        
        // Check if diagnosis is complete
        if (data.is_complete && data.diagnosis) {
          setDiagnosis(data.diagnosis);
        }
      }

      // Update session title if this is the first message
      if (messages.length === 1) {
        const title = userMsg.text.length > 30 
          ? `${userMsg.text.substring(0, 30)}...` 
          : userMsg.text;
        await axios.patch(
          `${API_URL}${API_ENDPOINTS.CHAT.SESSION(sessionId)}`,
          { title },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        onSessionUpdate?.();
      }
    } catch (err) {
      console.error("Error sending diagnostic message:", err);
      if (err.response?.status === 500) {
        const errorMsg = {
          id: Date.now() + 1,
          text: "⚠️ Sorry, I encountered an error. Please try again.",
          sender: "ai",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const formatMessage = (message) => {
    // Add phase indicator to AI messages
    if (message.sender === "ai" && message.phase && !message.isGreeting) {
      return `${message.text}\n\n*Currently in ${phaseInfo[message.phase]?.name || message.phase} phase*`;
    }
    return message.text;
  };

  return (
    <div className={`w-full h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header with Phase Indicator */}
      {showPhaseIndicator && (
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
              <div>
                <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mental Health Assessment
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${phaseInfo[currentPhase]?.color || 'bg-gray-400'}`}></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {phaseInfo[currentPhase]?.name || currentPhase}
                  </span>
                  {questionCount > 0 && (
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      • Question {questionCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPhaseIndicator(!showPhaseIndicator)}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <Activity className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2">
            <div className={`w-full h-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className={`h-1 rounded-full transition-all duration-300 ${phaseInfo[currentPhase]?.color || 'bg-gray-400'}`}
                style={{ 
                  width: `${Math.min(100, (questionCount / 25) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-100'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{formatMessage(message)}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user'
                    ? 'text-blue-100'
                    : darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className={`px-4 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Diagnosis Results */}
        {isComplete && diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border-l-4 border-blue-500 ${
              darkMode ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50'
            }`}
          >
            <h4 className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              Assessment Complete
            </h4>
            <p className={`text-sm mt-2 ${darkMode ? 'text-blue-200' : 'text-blue-600'}`}>
              Thank you for completing the assessment. Remember, this is a preliminary screening tool. 
              Please consult with a mental health professional for a comprehensive evaluation.
            </p>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isComplete ? "Assessment complete. Start a new conversation?" : "Type your response..."}
            disabled={isTyping}
            className={`flex-1 px-3 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          <button
            onClick={handleSendMessage}
            disabled={!showSendButton || isTyping}
            className={`p-2 rounded-lg ${
              showSendButton && !isTyping
                ? darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            } transition-colors`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Assessment Info */}
        <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          This is a mental health screening tool. It is not a substitute for professional diagnosis.
        </div>
      </div>
    </div>
  );
};

export default DiagnosticChatModule;
