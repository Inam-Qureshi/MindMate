import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Users } from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const ForumModule = ({ darkMode, activeSidebarItem = "questions" }) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newQuestionTitle, setNewQuestionTitle] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] = useState("general");
  const [newQuestionTags, setNewQuestionTags] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState("");
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [userType, setUserType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentUserId, setCurrentUserId] = useState(null);

  const categories = [
    { value: "general", label: "General" },
    { value: "anxiety", label: "Anxiety" },
    { value: "depression", label: "Depression" },
    { value: "stress", label: "Stress" },
    { value: "relationships", label: "Relationships" },
    { value: "addiction", label: "Addiction" },
    { value: "trauma", label: "Trauma" },
    { value: "other", label: "Other" }
  ];

  // Fetch user type and forum questions on component mount and when sidebar item changes
  useEffect(() => {
    fetchUserType();
    fetchQuestions();
    
    // Set up HTTP polling for real-time updates
    const pollInterval = setInterval(() => {
      fetchQuestions();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [activeSidebarItem]);

  const fetchUserType = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.AUTH.ME}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("User data response:", response.data); // Debug log

      // Check different possible response structures
      const userType = response.data.user_type || response.data.userType || response.data.role;
      const userId = response.data.id || response.data.user_id;

      console.log("Detected userType:", userType, "userId:", userId); // Debug log

      setUserType(userType);
      setCurrentUserId(userId);
    } catch (error) {
      console.error("Error fetching user type:", error);
      // Try to get user type from token or localStorage as fallback
      const storedUserType = localStorage.getItem("user_type");
      const storedUserId = localStorage.getItem("user_id");
      if (storedUserType) {
        setUserType(storedUserType);
        setCurrentUserId(storedUserId);
      }
    }
  }, [API_URL]);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      // Fetch different data based on activeSidebarItem
      switch (activeSidebarItem) {
        case "questions": {
          // Show questions asked by current user
          const myQuestionsResponse = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              patient_id: currentUserId,
              category: selectedCategory !== "all" ? selectedCategory : undefined
            }
          });
          setQuestions(myQuestionsResponse.data);
          break;
        }

        case "bookmarks": {
          // Show bookmarked questions
          const bookmarkedResponse = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { bookmarked: true, category: selectedCategory !== "all" ? selectedCategory : undefined }
          });
          setQuestions(bookmarkedResponse.data);
          break;
        }

        case "moderation": {
          // Show questions that need moderation (if user is moderator)
          if (userType === "admin" || userType === "moderator") {
            const moderationResponse = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
              headers: { Authorization: `Bearer ${token}` },
              params: { needs_moderation: true, category: selectedCategory !== "all" ? selectedCategory : undefined }
            });
            setQuestions(moderationResponse.data);
          } else {
            setQuestions([]);
          }
          break;
        }

        default: {
          // Default to all questions
          const defaultResponse = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { category: selectedCategory !== "all" ? selectedCategory : undefined }
          });
          setQuestions(defaultResponse.data);
          break;
        }
      }
    } catch (error) {
      console.error("Error fetching forum questions:", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, activeSidebarItem, currentUserId, selectedCategory, userType]);

  // Refetch questions when category filter or sidebar item changes
  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, activeSidebarItem, fetchQuestions]);

  // Helper functions for styling
  const getCategoryColor = (category) => {
    const colors = {
      general: "bg-gray-500",
      anxiety: "bg-yellow-500",
      depression: "bg-blue-500",
      stress: "bg-orange-500",
      relationships: "bg-pink-500",
      addiction: "bg-red-500",
      trauma: "bg-purple-500",
      other: "bg-gray-400"
    };
    return colors[category.toLowerCase()] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: "bg-green-500",
      answered: "bg-blue-500",
      closed: "bg-gray-500"
    };
    return colors[status.toLowerCase()] || colors.open;
  };

  // Get title and description based on active sidebar item
  const getSidebarContent = () => {
    switch (activeSidebarItem) {
      case "questions":
        return {
          title: "My Questions",
          description: "Questions you have asked in the forum",
          emptyMessage: "You haven't asked any questions yet"
        };
      case "bookmarks":
        return {
          title: "Bookmarked Questions",
          description: "Questions you have bookmarked for later",
          emptyMessage: "No bookmarked questions found"
        };
      case "moderation":
        return {
          title: "Moderation Queue",
          description: "Questions that need moderation review",
          emptyMessage: "No questions need moderation"
        };
      default:
        return {
          title: "All Questions",
          description: "Browse all forum questions",
          emptyMessage: "No questions found"
        };
    }
  };

  const fetchAnswers = async (questionId) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.ANSWERS_BY_QUESTION(questionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnswers(response.data);
    } catch (error) {
      console.error("Error fetching answers:", error);
    }
  };

  const handleAddQuestion = async () => {
    if (newQuestion.trim() === "" || newQuestionTitle.trim() === "") return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`,
        {
          title: newQuestionTitle,
          content: newQuestion,
          category: newQuestionCategory,
          is_anonymous: isAnonymous,
          is_urgent: false
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Add new question to the list
      setQuestions([response.data, ...questions]);
      
      // Clear form and hide it
      setNewQuestion("");
      setNewQuestionTitle("");
      setNewQuestionCategory("general");
      setNewQuestionTags("");
      setIsAnonymous(false);
      setShowNewQuestionForm(false);
    } catch (error) {
      console.error("Error creating forum question:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}${API_ENDPOINTS.FORUM.QUESTION_DELETE(questionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove question from list
      setQuestions(Array.isArray(questions) ? questions.filter(question => question.id !== questionId) : []);
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const handleViewQuestion = async (question) => {
    setSelectedQuestion(question);
    await fetchAnswers(question.id);
    setShowAnswerForm(false);
  };

  const handleAddAnswer = async () => {
    if (newAnswer.trim() === "" || !selectedQuestion) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.FORUM.ANSWER_CREATE(selectedQuestion.id)}`,
        {
          content: newAnswer
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Add new answer to the list
      setAnswers([...answers, response.data]);
      
      // Update question answers count
      setQuestions(Array.isArray(questions) ? questions.map(q => 
        q.id === selectedQuestion.id 
          ? { ...q, answer_count: q.answer_count + 1 }
          : q
      ) : []);
      
      // Clear form
      setNewAnswer("");
      setShowAnswerForm(false);
    } catch (error) {
      console.error("Error creating answer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportPost = async (postId, postType) => {
    if (!window.confirm(`Are you sure you want to report this ${postType}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}${API_ENDPOINTS.FORUM.REPORTS}`,
        {
          post_id: postId,
          post_type: postType
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      alert(`${postType} reported successfully!`);
      // Optionally, refresh the questions/answers to show updated status
      if (postType === "question") {
        fetchQuestions();
      } else if (postType === "answer") {
        if (selectedQuestion) {
          await fetchAnswers(selectedQuestion.id);
        }
      }
    } catch (error) {
      console.error("Error reporting post:", error);
      alert(`Failed to report ${postType}: ${error.message}`);
    }
  };

  return (
    <div className={`h-full overflow-y-auto p-6 ${darkMode ? "bg-transparent text-white" : "bg-transparent text-gray-900"}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-2xl shadow-xl backdrop-blur-sm ${
            darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${darkMode ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-blue-400 to-indigo-500"}`}>
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {getSidebarContent().title}
                </h1>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {getSidebarContent().description}
                </p>
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              
              {/* Only show "Ask Question" button for patients */}
              {userType === "patient" && (
                <button
                  onClick={() => setShowNewQuestionForm(!showNewQuestionForm)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {showNewQuestionForm ? "Cancel" : "Ask Question"}
                </button>
              )}
            </div>
          </div>

          {/* New Question Form */}
          {showNewQuestionForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mb-8 p-6 rounded-xl shadow-lg ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3 className="text-xl font-semibold mb-4">Share your question</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Question title"
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <textarea
                  placeholder="Describe your question in detail..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={4}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value)}
                    className={`p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Tags (optional)"
                    value={newQuestionTags}
                    onChange={(e) => setNewQuestionTags(e.target.value)}
                    className={`p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="anonymous">Post anonymously</label>
                </div>
                <button
                  onClick={handleAddQuestion}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : darkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {loading ? "Posting..." : "Post Question"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Questions List */}
          <div className="space-y-6">
            {Array.isArray(questions) && questions.map((question) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5, scale: 1.01 }}
                className={`p-6 rounded-2xl shadow-lg cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                  darkMode ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700" : "bg-white/80 hover:bg-gray-50/80 border border-gray-200"
                }`}
                onClick={() => handleViewQuestion(question)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{question.title}</h3>
                    <p className={`${darkMode ? "text-gray-200" : "text-gray-600"}`}>
                      {question.content.length > 150
                        ? `${question.content.substring(0, 150)}...`
                        : question.content}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(question.category)}`}>
                      {question.category}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(question.status)}`}>
                      {question.status}
                    </span>
                    {/* Delete button for patients who own the question */}
                    {(userType === "patient" && currentUserId === question.author_id) || 
                     (userType === "patient" && !currentUserId) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this question?")) {
                            handleDeleteQuestion(question.id);
                          }
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        🗑️ Delete
                      </button>
                    ) : null}
                    
                    {/* Report button for all users */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportPost(question.id, "question");
                      }}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                        ⚠️ Report
                      </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {question.author_name}
                    </span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {question.time_ago}
                    </span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {question.answer_count} answers
                    </span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {question.view_count} views
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {(!Array.isArray(questions) || questions.length === 0) && (
            <div className="text-center py-12">
              <p className={`text-xl ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {getSidebarContent().emptyMessage}
              </p>
              {activeSidebarItem === "questions" && (
                <p className={`text-sm mt-2 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                  Be the first to ask a question!
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Question Detail Modal */}
        {selectedQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedQuestion(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold">{selectedQuestion.title}</h2>
                  <div className="flex items-center space-x-2">
                    {/* Delete button for patients who own the question */}
                    {(userType === "patient" && currentUserId === selectedQuestion.author_id) || 
                     (userType === "patient" && !currentUserId) ? (
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this question?")) {
                            handleDeleteQuestion(selectedQuestion.id);
                            setSelectedQuestion(null);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        🗑️ Delete Question
                      </button>
                    ) : null}
                    <button
                      onClick={() => setSelectedQuestion(null)}
                      className={`p-2 rounded-full ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-lg mb-4">{selectedQuestion.content}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      By {selectedQuestion.author_name}
                    </span>
                    <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {selectedQuestion.time_ago}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(selectedQuestion.category)}`}>
                      {selectedQuestion.category}
                    </span>
                  </div>
                </div>

                {/* Answers Section */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Answers ({answers.length})
                  </h3>
                  
                  {answers.map((answer) => (
                    <div key={answer.id} className={`p-4 rounded-lg mb-4 ${
                      darkMode ? "bg-gray-700" : "bg-gray-50"
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="mb-2">{answer.content}</p>
                        <button
                          onClick={() => handleReportPost(answer.id, "answer")}
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          ⚠️ Report
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          By {answer.specialist_name}
                        </span>
                        <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {answer.time_ago}
                        </span>
                      </div>
                    </div>
                  ))}

                  {answers.length === 0 && (
                    <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      No answers yet. Be the first to help!
                    </p>
                  )}
                </div>

                {/* Add Answer Form - Only for specialists */}
                {userType === "specialist" && (
                  <div className="border-t pt-6">
                    <button
                      onClick={() => setShowAnswerForm(!showAnswerForm)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        darkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {showAnswerForm ? "Cancel" : "Add Answer"}
                    </button>
                    
                    {showAnswerForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4"
                      >
                        <textarea
                          placeholder="Write your answer..."
                          value={newAnswer}
                          onChange={(e) => setNewAnswer(e.target.value)}
                          rows={4}
                          className={`w-full p-3 rounded-lg border mb-4 ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                        <button
                          onClick={handleAddAnswer}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            loading
                              ? "bg-gray-400 cursor-not-allowed"
                              : darkMode
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          }`}
                        >
                          {loading ? "Posting..." : "Post Answer"}
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ForumModule;