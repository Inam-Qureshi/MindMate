import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  MessageCircle,
  Search,
  Filter,
  Heart,
  Bookmark,
  Flag,
  Edit3,
  Clock,
  Eye,
  MessageSquare,
  User,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  AlertCircle,
  X,
  Grid,
  List,
  Users,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Star,
  Shield,
  Zap,
  Sun,
  Moon
} from "react-feather";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../config/api";

const SpecialistForumPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  
  // Form states
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [newAnswer, setNewAnswer] = useState("");
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  
  // Edit states
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [editAnswerContent, setEditAnswerContent] = useState("");
  
  // View states
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Bookmark state
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());

  const categories = [
    { value: "all", label: "All Categories", icon: Grid },
    { value: "general", label: "General", icon: HelpCircle },
    { value: "anxiety", label: "Anxiety", icon: AlertCircle },
    { value: "depression", label: "Depression", icon: Heart },
    { value: "stress", label: "Stress", icon: Zap },
    { value: "relationships", label: "Relationships", icon: Users },
    { value: "addiction", label: "Addiction", icon: Shield },
    { value: "trauma", label: "Trauma", icon: Flag },
    { value: "other", label: "Other", icon: MessageCircle }
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First", icon: Clock },
    { value: "oldest", label: "Oldest First", icon: Clock },
    { value: "most_answered", label: "Most Answered", icon: MessageSquare },
    { value: "least_answered", label: "Least Answered", icon: MessageSquare },
    { value: "most_viewed", label: "Most Viewed", icon: Eye },
    { value: "urgent", label: "Urgent First", icon: AlertCircle }
  ];

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  // Fetch user type and questions on component mount
  useEffect(() => {
    fetchUserType();
    fetchQuestions();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const fetchUserType = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(`${API_URL}${API_ENDPOINTS.AUTH.ME}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data;
      console.log("User data response:", userData);
      
      // Check if user is a specialist
      if (userData.user_type !== "specialist") {
        toast.error("Access denied. Only specialists can access this page.");
        navigate("/login");
        return;
      }
      
      setUserType(userData.user_type);
      setCurrentUserId(userData.user_id);
      setAuthLoading(false);
    } catch (error) {
      console.error("Error fetching user type:", error);
      toast.error("Authentication failed. Please login again.");
      navigate("/login");
    }
  }, [API_URL, navigate]);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      if (!token) {
        console.error("No access token found");
        return;
      }

      // Fetch all questions (patients asking questions)
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          sort_by: sortBy
        }
      });

      console.log("Questions response:", response.data);
      
      // Handle the correct response format from backend
      if (response.data && response.data.questions) {
        setQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
      } else if (Array.isArray(response.data)) {
        // Fallback for direct array response
        setQuestions(response.data);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      setQuestions([]);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [API_URL, selectedCategory, sortBy]);

  const fetchAnswers = useCallback(async (questionId) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.ANSWERS_BY_QUESTION(questionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAnswers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching answers:", error);
      setAnswers([]);
    }
  }, [API_URL]);

  // Filter and sort questions
  const processedQuestions = useMemo(() => {
    let filtered = questions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.title?.toLowerCase().includes(query) ||
        q.content?.toLowerCase().includes(query) ||
        q.tags?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered = [...filtered].sort((a, b) => new Date(b.asked_at || b.created_at) - new Date(a.asked_at || a.created_at));
        break;
      case "oldest":
        filtered = [...filtered].sort((a, b) => new Date(a.asked_at || a.created_at) - new Date(b.asked_at || b.created_at));
        break;
      case "most_answered":
        filtered = [...filtered].sort((a, b) => (b.answers_count || 0) - (a.answers_count || 0));
        break;
      case "least_answered":
        filtered = [...filtered].sort((a, b) => (a.answers_count || 0) - (b.answers_count || 0));
        break;
      case "most_viewed":
        filtered = [...filtered].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case "urgent":
        filtered = [...filtered].sort((a, b) => (b.is_urgent ? 1 : 0) - (a.is_urgent ? 1 : 0));
        break;
    }

    return filtered;
  }, [questions, searchQuery, selectedCategory, sortBy]);

  const handleAnswerSubmit = async (questionId) => {
    if (!newAnswer.trim()) {
      toast.error("Please enter an answer");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API_URL}${API_ENDPOINTS.FORUM.ANSWER_CREATE(questionId)}`, {
        content: newAnswer.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Answer submitted successfully!");
      setNewAnswer("");
      setShowAnswerForm(false);
      setAnsweringQuestionId(null);
      
      // Refresh answers for the current question
      if (selectedQuestion?.id === questionId) {
        await fetchAnswers(questionId);
      }
      
      // Refresh questions to update answer count
      await fetchQuestions();
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer");
    }
  };

  const handleEditAnswer = async (answerId) => {
    if (!editAnswerContent.trim()) {
      toast.error("Please enter answer content");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.put(`${API_URL}${API_ENDPOINTS.FORUM.ANSWER_UPDATE(answerId)}`, {
        content: editAnswerContent.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Answer updated successfully!");
      setEditingAnswer(null);
      setEditAnswerContent("");
      
      // Refresh answers for the current question
      if (selectedQuestion?.id) {
        await fetchAnswers(selectedQuestion.id);
      }
    } catch (error) {
      console.error("Error updating answer:", error);
      toast.error("Failed to update answer");
    }
  };

  const handleDeleteAnswer = async (answerId) => {
    if (!window.confirm("Are you sure you want to delete this answer?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}${API_ENDPOINTS.FORUM.ANSWER_DELETE(answerId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Answer deleted successfully!");
      
      // Refresh answers for the current question
      if (selectedQuestion?.id) {
        await fetchAnswers(selectedQuestion.id);
      }
      
      // Refresh questions to update answer count
      await fetchQuestions();
    } catch (error) {
      console.error("Error deleting answer:", error);
      toast.error("Failed to delete answer");
    }
  };

  const startEditAnswer = (answer) => {
    setEditingAnswer(answer);
    setEditAnswerContent(answer.content);
  };

  const cancelEditAnswer = () => {
    setEditingAnswer(null);
    setEditAnswerContent("");
  };

  const handleQuestionSelect = async (question) => {
    setSelectedQuestion(question);
    await fetchAnswers(question.id);
  };

  const toggleBookmark = async (questionId) => {
    // Implementation for bookmarking would go here
    const newBookmarked = new Set(bookmarkedQuestions);
    if (newBookmarked.has(questionId)) {
      newBookmarked.delete(questionId);
    } else {
      newBookmarked.add(questionId);
    }
    setBookmarkedQuestions(newBookmarked);
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: "bg-gray-100 text-gray-800",
      anxiety: "bg-yellow-100 text-yellow-800",
      depression: "bg-blue-100 text-blue-800",
      stress: "bg-red-100 text-red-800",
      relationships: "bg-pink-100 text-pink-800",
      addiction: "bg-purple-100 text-purple-800",
      trauma: "bg-orange-100 text-orange-800",
      other: "bg-indigo-100 text-indigo-800"
    };
    return colors[category] || colors.general;
  };

  const QuestionCard = ({ question }) => {
    const CategoryIcon = categories.find(c => c.value === question.category)?.icon || HelpCircle;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-lg cursor-pointer ${
          darkMode 
            ? "bg-gray-800 border-gray-700 hover:border-gray-600" 
            : "bg-white border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => handleQuestionSelect(question)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getCategoryColor(question.category)}`}>
              <CategoryIcon size={16} />
            </div>
            <div>
              <h3 className={`font-semibold text-lg ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {question.title}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  {question.is_anonymous ? "Anonymous" : question.author_name}
                </span>
                <span className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  {getTimeAgo(question.asked_at || question.created_at)}
                </span>
                {question.is_urgent && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <AlertCircle size={12} className="mr-1" />
                    Urgent
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(question.id);
              }}
              className={`p-2 rounded-lg transition-colors ${
                bookmarkedQuestions.has(question.id)
                  ? "text-yellow-500 bg-yellow-50"
                  : darkMode 
                    ? "text-gray-400 hover:text-yellow-500 hover:bg-gray-700" 
                    : "text-gray-400 hover:text-yellow-500 hover:bg-gray-50"
              }`}
            >
              <Bookmark size={16} fill={bookmarkedQuestions.has(question.id) ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <p className={`text-sm mb-4 line-clamp-3 ${
          darkMode ? "text-gray-300" : "text-gray-600"
        }`}>
          {question.content}
        </p>

        {question.tags && (
          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags.split(',').map((tag, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded-full text-xs ${
                  darkMode 
                    ? "bg-gray-700 text-gray-300" 
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                #{tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <MessageSquare size={16} className={darkMode ? "text-gray-400" : "text-gray-500"} />
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {question.answers_count || 0} answers
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye size={16} className={darkMode ? "text-gray-400" : "text-gray-500"} />
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {question.view_count || 0} views
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAnsweringQuestionId(question.id);
              setShowAnswerForm(true);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            Answer
          </button>
        </div>
      </motion.div>
    );
  };

  const AnswerCard = ({ answer }) => {
    const isOwnAnswer = answer.specialist_id === currentUserId;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg border ${
          darkMode 
            ? "bg-gray-800 border-gray-700" 
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              darkMode ? "bg-blue-600" : "bg-blue-500"
            }`}>
              <User size={16} className="text-white" />
            </div>
            <div>
              <h4 className={`font-medium ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {answer.specialist_name}
                {isOwnAnswer && (
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                    darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"
                  }`}>
                    You
                  </span>
                )}
              </h4>
              <span className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}>
                {getTimeAgo(answer.answered_at || answer.created_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {answer.is_best_answer && (
              <div className="flex items-center space-x-1 text-green-500">
                <Star size={16} fill="currentColor" />
                <span className="text-sm font-medium">Best Answer</span>
              </div>
            )}
            {isOwnAnswer && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => startEditAnswer(answer)}
                  className={`p-1 rounded transition-colors ${
                    darkMode 
                      ? "text-gray-400 hover:text-blue-400 hover:bg-gray-700" 
                      : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                  title="Edit answer"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteAnswer(answer.id)}
                  className={`p-1 rounded transition-colors ${
                    darkMode 
                      ? "text-gray-400 hover:text-red-400 hover:bg-gray-700" 
                      : "text-gray-500 hover:text-red-600 hover:bg-gray-100"
                  }`}
                  title="Delete answer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {editingAnswer?.id === answer.id ? (
          <div className="space-y-3">
            <textarea
              value={editAnswerContent}
              onChange={(e) => setEditAnswerContent(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border transition-colors resize-none ${
                darkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-400"
              }`}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelEditAnswer}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  darkMode 
                    ? "text-gray-300 hover:text-white hover:bg-gray-700" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditAnswer(answer.id)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-sm ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            {answer.content}
          </p>
        )}
      </motion.div>
    );
  };

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode 
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
        : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
    }`}>
      {/* Header with Navigation */}
      <header className={`sticky top-0 z-50 ${
        darkMode ? "bg-gray-800" : "bg-white"
      } shadow-md py-4 px-6`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/specialist-dashboard")}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? "text-gray-400 hover:text-white hover:bg-gray-700" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title="Back to Dashboard"
            >
              <X size={20} />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                M
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                MindMate Specialist Forum
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors ${
                darkMode
                  ? "bg-gray-700 text-yellow-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigate("/specialist-dashboard")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-3xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                Community Forum
              </h1>
              <p className={`text-lg ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Answer patient questions and help the community
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? "text-gray-400 hover:text-white hover:bg-gray-700" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {viewMode === "grid" ? <List size={20} /> : <Grid size={20} />}
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`} />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-gray-600" 
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-400"
                }`}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? "bg-gray-800 border-gray-700 text-white focus:border-gray-600" 
                    : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
                }`}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? "bg-gray-800 border-gray-700 text-white focus:border-gray-600" 
                    : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
                }`}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Questions List */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                Patient Questions ({processedQuestions.length})
              </h2>
              
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`p-6 rounded-xl border animate-pulse ${
                      darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                    }`}>
                      <div className={`h-4 rounded mb-2 ${
                        darkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}></div>
                      <div className={`h-3 rounded mb-4 ${
                        darkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}></div>
                      <div className={`h-3 rounded w-2/3 ${
                        darkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}></div>
                    </div>
                  ))}
                </div>
              ) : processedQuestions.length > 0 ? (
                <div className={`space-y-4 ${
                  viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""
                }`}>
                  {processedQuestions.map((question) => (
                    <QuestionCard key={question.id} question={question} />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-xl mb-2">No questions found</p>
                  <p className="text-sm">
                    {searchQuery ? "Try adjusting your search criteria" : "No questions available in this category"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Question Details & Answers */}
          <div className="lg:col-span-1">
            {selectedQuestion ? (
              <div className={`p-6 rounded-xl border ${
                darkMode 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-200"
              }`}>
                <div className="mb-6">
                  <h3 className={`text-xl font-semibold mb-3 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {selectedQuestion.title}
                  </h3>
                  <div className="flex items-center space-x-4 mb-4">
                    <span className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {selectedQuestion.is_anonymous ? "Anonymous" : selectedQuestion.author_name}
                    </span>
                    <span className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {getTimeAgo(selectedQuestion.asked_at || selectedQuestion.created_at)}
                    </span>
                    {selectedQuestion.is_urgent && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle size={12} className="mr-1" />
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}>
                    {selectedQuestion.content}
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-4 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    Answers ({answers.length})
                  </h4>
                  
                  {answers.length > 0 ? (
                    <div className="space-y-4">
                      {answers.map((answer) => (
                        <AnswerCard key={answer.id} answer={answer} />
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No answers yet</p>
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => {
                      setAnsweringQuestionId(selectedQuestion.id);
                      setShowAnswerForm(true);
                    }}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    <Send size={16} className="inline mr-2" />
                    Answer This Question
                  </button>
                </div>
              </div>
            ) : (
              <div className={`text-center py-12 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}>
                <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-xl mb-2">Select a Question</p>
                <p className="text-sm">Choose a question from the list to view details and answers</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answer Form Modal */}
      <AnimatePresence>
        {showAnswerForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAnswerForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-2xl p-6 rounded-xl ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  Answer Question
                </h3>
                <button
                  onClick={() => setShowAnswerForm(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? "text-gray-400 hover:text-white hover:bg-gray-700" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Your Answer
                </label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Provide a helpful and professional answer..."
                  rows={6}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none ${
                    darkMode 
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-400"
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAnswerForm(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    darkMode 
                      ? "text-gray-300 hover:text-white hover:bg-gray-700" 
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAnswerSubmit(answeringQuestionId)}
                  disabled={!newAnswer.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    newAnswer.trim()
                      ? darkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                      : darkMode
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Submit Answer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpecialistForumPage;
