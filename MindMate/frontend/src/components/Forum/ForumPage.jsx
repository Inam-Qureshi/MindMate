import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  Heart, 
  Bookmark, 
  Flag, 
  Trash2, 
  Edit3, 
  Clock, 
  Eye, 
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
  Moon,
  User,
  Calendar,
  Tag,
  MoreVertical
} from 'react-feather';
import ForumHeader from './ForumHeader';
import ForumNavigation from './ForumNavigation';
import QuestionList from './QuestionList';
import QuestionDetails from './QuestionDetails';
import QuestionForm from './QuestionForm';
import ForumFilters from './ForumFilters';
import ForumSearch from './ForumSearch';
import forumAPI from '../../utils/forumApi';

const ForumPage = ({ darkMode }) => {
  // State management
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Navigation and view states
  const [activeTab, setActiveTab] = useState('all');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    tags: [],
    urgent: false,
    answered: false
  });
  
  // Form states
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
    is_anonymous: false,
    is_urgent: false
  });
  const [newAnswer, setNewAnswer] = useState('');
  
  // Bookmark and interaction states
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
  const [likedQuestions, setLikedQuestions] = useState(new Set());
  const [likedAnswers, setLikedAnswers] = useState(new Set());

  const tabs = [
    { id: 'all', label: 'All Questions', icon: <MessageCircle size={18} />, count: 0 },
    { id: 'my_questions', label: 'My Questions', icon: <User size={18} />, count: 0 },
    { id: 'my_answers', label: 'My Answers', icon: <CheckCircle size={18} />, count: 0 },
    { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark size={18} />, count: 0 },
    { id: 'answered', label: 'Answered', icon: <Award size={18} />, count: 0 },
    { id: 'urgent', label: 'Urgent', icon: <AlertCircle size={18} />, count: 0 }
  ];

  const categories = [
    { value: 'all', label: 'All Categories', icon: <Grid size={16} /> },
    { value: 'general', label: 'General', icon: <MessageCircle size={16} /> },
    { value: 'anxiety', label: 'Anxiety', icon: <AlertCircle size={16} /> },
    { value: 'depression', label: 'Depression', icon: <Heart size={16} /> },
    { value: 'stress', label: 'Stress', icon: <Zap size={16} /> },
    { value: 'relationships', label: 'Relationships', icon: <Users size={16} /> },
    { value: 'addiction', label: 'Addiction', icon: <Shield size={16} /> },
    { value: 'trauma', label: 'Trauma', icon: <HelpCircle size={16} /> },
    { value: 'other', label: 'Other', icon: <MoreVertical size={16} /> }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: <Clock size={16} /> },
    { value: 'oldest', label: 'Oldest First', icon: <Clock size={16} /> },
    { value: 'most_answered', label: 'Most Answered', icon: <MessageCircle size={16} /> },
    { value: 'most_viewed', label: 'Most Viewed', icon: <Eye size={16} /> },
    { value: 'most_liked', label: 'Most Liked', icon: <ThumbsUp size={16} /> },
    { value: 'trending', label: 'Trending', icon: <TrendingUp size={16} /> }
  ];

  // Initialize component
  useEffect(() => {
    fetchUserType();
    fetchQuestions();
  }, []);

  // Fetch user type and ID
  const fetchUserType = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setUserType(response.data.user_type);
        setCurrentUserId(response.data.id);
      }
    } catch (error) {
      console.error('Error fetching user type:', error);
    }
  }, []);

  // Fetch questions from backend
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await forumAPI.getQuestions({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        question_status: filters.status !== 'all' ? filters.status : undefined,
        urgent_only: filters.urgent || undefined,
        sort_by: sortBy,
        limit: 20,
        offset: 0
      });

      if (response) {
        // Handle backend response format
        const questions = response.questions || response;
        setQuestions(questions);
        applyFilters(questions);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, filters]);

  // Apply filters to questions
  const applyFilters = useCallback((questionsList) => {
    let filtered = [...questionsList];

    // Apply tab filter
    switch (activeTab) {
      case 'my_questions':
        filtered = filtered.filter(q => q.patient_id === currentUserId || q.specialist_id === currentUserId);
        break;
      case 'my_answers':
        // This would need to be implemented with user's answers
        filtered = filtered.filter(q => q.answers?.some(a => a.patient_id === currentUserId || a.specialist_id === currentUserId));
        break;
      case 'bookmarks':
        filtered = filtered.filter(q => bookmarkedQuestions.has(q.id));
        break;
      case 'answered':
        filtered = filtered.filter(q => q.status === 'answered');
        break;
      case 'urgent':
        filtered = filtered.filter(q => q.is_urgent);
        break;
      default:
        // All questions
        break;
    }

    setFilteredQuestions(filtered);
  }, [activeTab, currentUserId, bookmarkedQuestions]);

  // Handle question selection
  const handleQuestionSelect = (question) => {
    setSelectedQuestion(question);
    fetchAnswers(question.id);
  };

  // Fetch answers for a question
  const fetchAnswers = async (questionId) => {
    try {
      const response = await forumAPI.getAnswers(questionId);
      if (response) {
        setAnswers(response);
      }
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  // Handle question creation
  const handleCreateQuestion = async (questionData) => {
    try {
      setLoading(true);
      
      const response = await forumAPI.createQuestion(questionData);

      if (response) {
        setQuestions(prev => [response, ...prev]);
        setShowQuestionForm(false);
        setNewQuestion({
          title: '',
          content: '',
          category: 'general',
          tags: '',
          is_anonymous: false,
          is_urgent: false
        });
      }
    } catch (error) {
      console.error('Error creating question:', error);
      setError('Failed to create question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle answer creation
  const handleCreateAnswer = async (questionId, answerData) => {
    try {
      setLoading(true);
      
      const response = await forumAPI.createAnswer(questionId, answerData);

      if (response) {
        setAnswers(prev => [...prev, response]);
        // Update question answer count
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, answer_count: q.answer_count + 1 }
            : q
        ));
      }
    } catch (error) {
      console.error('Error creating answer:', error);
      setError('Failed to create answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle bookmark toggle
  const handleBookmarkToggle = async (questionId) => {
    try {
      const token = localStorage.getItem("access_token");
      
      if (bookmarkedQuestions.has(questionId)) {
        // Remove bookmark
        await axios.delete(`${API_URL}/api/forum/bookmarks/${questionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookmarkedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
      } else {
        // Add bookmark
        await axios.post(`${API_URL}/api/forum/bookmarks`, 
          { question_id: questionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setBookmarkedQuestions(prev => new Set([...prev, questionId]));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Handle like toggle
  const handleLikeToggle = async (itemId, type) => {
    try {
      const token = localStorage.getItem("access_token");
      const endpoint = type === 'question' 
        ? `/api/forum/questions/${itemId}/vote`
        : `/api/forum/answers/${itemId}/vote`;
      
      await axios.post(`${API_URL}${endpoint}`, 
        { vote_type: 'like' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (type === 'question') {
        setLikedQuestions(prev => {
          const newSet = new Set(prev);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          return newSet;
        });
      } else {
        setLikedAnswers(prev => {
          const newSet = new Set(prev);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Handle sort change
  const handleSortChange = (sort) => {
    setSortBy(sort);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Handle question form toggle
  const handleQuestionFormToggle = () => {
    setShowQuestionForm(!showQuestionForm);
    setEditingQuestion(null);
  };

  // Handle question edit
  const handleQuestionEdit = (question) => {
    setEditingQuestion(question);
    setNewQuestion({
      title: question.title,
      content: question.content,
      category: question.category,
      tags: question.tags || '',
      is_anonymous: question.is_anonymous,
      is_urgent: question.is_urgent
    });
    setShowQuestionForm(true);
  };

  // Handle question delete
  const handleQuestionDelete = async (questionId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}/api/forum/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Failed to delete question. Please try again.');
    }
  };

  // Handle answer edit
  const handleAnswerEdit = (answer) => {
    setEditingAnswer(answer);
    setNewAnswer(answer.content);
  };

  // Handle answer delete
  const handleAnswerDelete = async (answerId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}/api/forum/answers/${answerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAnswers(prev => prev.filter(a => a.id !== answerId));
    } catch (error) {
      console.error('Error deleting answer:', error);
      setError('Failed to delete answer. Please try again.');
    }
  };

  // Get tab counts
  const getTabCounts = () => {
    const counts = {
      all: questions.length,
      my_questions: questions.filter(q => q.patient_id === currentUserId || q.specialist_id === currentUserId).length,
      my_answers: questions.filter(q => q.answers?.some(a => a.patient_id === currentUserId || a.specialist_id === currentUserId)).length,
      bookmarks: bookmarkedQuestions.size,
      answered: questions.filter(q => q.status === 'answered').length,
      urgent: questions.filter(q => q.is_urgent).length
    };
    
    return counts;
  };

  const tabCounts = getTabCounts();

  return (
    <div className={`forum-page ${darkMode ? 'dark' : ''}`}>
      <div className="forum-container">
        {/* Forum Header */}
        <ForumHeader
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onFilterToggle={() => setShowFilters(!showFilters)}
          onQuestionFormToggle={handleQuestionFormToggle}
          showFilters={showFilters}
          darkMode={darkMode}
        />

        {/* Forum Navigation */}
        <ForumNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabCounts={tabCounts}
          darkMode={darkMode}
        />

        {/* Forum Filters */}
        <AnimatePresence>
          {showFilters && (
            <ForumFilters
              categories={categories}
              sortOptions={sortOptions}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              filters={filters}
              onCategoryChange={handleCategoryChange}
              onSortChange={handleSortChange}
              onFilterChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
              darkMode={darkMode}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="forum-content">
          {selectedQuestion ? (
            <QuestionDetails
              question={selectedQuestion}
              answers={answers}
              onBack={() => setSelectedQuestion(null)}
              onCreateAnswer={handleCreateAnswer}
              onLikeToggle={handleLikeToggle}
              onBookmarkToggle={handleBookmarkToggle}
              onAnswerEdit={handleAnswerEdit}
              onAnswerDelete={handleAnswerDelete}
              likedAnswers={likedAnswers}
              bookmarkedQuestions={bookmarkedQuestions}
              currentUserId={currentUserId}
              userType={userType}
              darkMode={darkMode}
            />
          ) : (
            <QuestionList
              questions={filteredQuestions}
              loading={loading}
              error={error}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onQuestionSelect={handleQuestionSelect}
              onQuestionEdit={handleQuestionEdit}
              onQuestionDelete={handleQuestionDelete}
              onBookmarkToggle={handleBookmarkToggle}
              onLikeToggle={handleLikeToggle}
              bookmarkedQuestions={bookmarkedQuestions}
              likedQuestions={likedQuestions}
              currentUserId={currentUserId}
              userType={userType}
              darkMode={darkMode}
            />
          )}
        </div>

        {/* Question Form Modal */}
        <AnimatePresence>
          {showQuestionForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowQuestionForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <QuestionForm
                  question={editingQuestion}
                  questionData={newQuestion}
                  onQuestionDataChange={setNewQuestion}
                  onSubmit={handleCreateQuestion}
                  onClose={() => setShowQuestionForm(false)}
                  loading={loading}
                  darkMode={darkMode}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ForumPage;
