import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const ForumModule = ({ darkMode }) => {
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

  // Fetch forum questions on component mount
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const fetchQuestions = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(response.data);
    } catch (error) {
      console.error("Error fetching forum questions:", error);
    }
  }, [API_URL]);

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
          tags: newQuestionTags || null,
          is_anonymous: isAnonymous
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
      setQuestions(questions.map(q => 
        q.id === selectedQuestion.id 
          ? { ...q, answers_count: q.answers_count + 1 }
          : q
      ));
      
      // Clear form
      setNewAnswer("");
      setShowAnswerForm(false);
    } catch (error) {
      console.error("Error creating answer:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: "bg-gray-500",
      anxiety: "bg-red-500",
      depression: "bg-blue-500",
      stress: "bg-yellow-500",
      relationships: "bg-pink-500",
      addiction: "bg-purple-500",
      trauma: "bg-indigo-500",
      other: "bg-gray-400"
    };
    return colors[category] || colors.general;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: "bg-yellow-500",
      answered: "bg-green-500",
      closed: "bg-gray-500"
    };
    return colors[status] || colors.open;
  };

  return (
    <div className={`h-full overflow-y-auto p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Forum
            </h1>
            <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Ask questions and get answers from mental health specialists
            </p>
          </div>
          <button
            onClick={() => setShowNewQuestionForm(!showNewQuestionForm)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {showNewQuestionForm ? "Cancel" : "Ask Question"}
          </button>
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
          {questions.map((question) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-xl ${
                darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => handleViewQuestion(question)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{question.title}</h3>
                  <p className={`text-gray-600 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
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
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-4">
                  <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    By {question.author_name}
                  </span>
                  <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {question.time_ago}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {question.answers_count} answers
                  </span>
                  <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {question.views_count} views
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="text-center py-12">
            <p className={`text-xl ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              No forum questions yet. Be the first to ask!
            </p>
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
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className={`p-2 rounded-full ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                >
                  ✕
                </button>
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
                    <p className="mb-2">{answer.content}</p>
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

              {/* Add Answer Form */}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ForumModule;
