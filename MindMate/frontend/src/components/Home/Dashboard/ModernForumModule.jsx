import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
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
  List
} from "react-feather";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const ModernForumModule = ({ darkMode, activeSidebarItem = "questions" }) => {
  // State management
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [userType, setUserType] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  
  // Form states
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    is_anonymous: false,
    is_urgent: false
  });
  const [newAnswer, setNewAnswer] = useState("");
  
  // PHASE 1: Form dirty state tracking
  const [formDirty, setFormDirty] = useState(false);
  const [answerFormDirty, setAnswerFormDirty] = useState(false);
  
  // View states
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Bookmark state
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());

  // Edit states
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    is_urgent: false
  });
  const [editAnswerData, setEditAnswerData] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const questionsPerPage = 20;

  // Real-time updates
  const pollIntervalRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  
  // PHASE 1: Use ref for currentPage to avoid re-render loops
  const currentPageRef = useRef(1);
  const isMountedRef = useRef(false);

  // PHASE 1: Modal refs for focus management
  const newQuestionModalRef = useRef(null);
  const questionDetailModalRef = useRef(null);
  const firstInputRef = useRef(null);

  // PHASE 1: Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "danger" // danger, warning, info
  });

  // PHASE 1: Report modal state
  const [reportDialog, setReportDialog] = useState({
    show: false,
    type: "", // question or answer
    id: null,
    reason: ""
  });

  // PHASE 1: Search debounce
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchTimeoutRef = useRef(null);

  // PHASE 2: Action loading states
  const [actionLoading, setActionLoading] = useState({
    deleteQuestion: null,
    deleteAnswer: null,
    likeAnswer: null,
    bookmark: null
  });

  // PHASE 2: Like states (track liked answers)
  const [likedAnswers, setLikedAnswers] = useState(new Set());

  // Enhanced categories with icons and colors
  const categories = [
    { value: "general", label: "General", icon: "💬", color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-200" },
    { value: "anxiety", label: "Anxiety", icon: "😰", color: "yellow", bgColor: "bg-yellow-50", textColor: "text-yellow-700", borderColor: "border-yellow-200" },
    { value: "depression", label: "Depression", icon: "😔", color: "indigo", bgColor: "bg-indigo-50", textColor: "text-indigo-700", borderColor: "border-indigo-200" },
    { value: "stress", label: "Stress", icon: "😤", color: "orange", bgColor: "bg-orange-50", textColor: "text-orange-700", borderColor: "border-orange-200" },
    { value: "relationships", label: "Relationships", icon: "❤️", color: "pink", bgColor: "bg-pink-50", textColor: "text-pink-700", borderColor: "border-pink-200" },
    { value: "addiction", label: "Addiction", icon: "🚫", color: "red", bgColor: "bg-red-50", textColor: "text-red-700", borderColor: "border-red-200" },
    { value: "trauma", label: "Trauma", icon: "🛡️", color: "purple", bgColor: "bg-purple-50", textColor: "text-purple-700", borderColor: "border-purple-200" },
    { value: "other", label: "Other", icon: "❓", color: "gray", bgColor: "bg-gray-50", textColor: "text-gray-700", borderColor: "border-gray-200" }
  ];

  // Dark mode category colors
  const darkCategories = [
    { value: "general", label: "General", icon: "💬", color: "blue", bgColor: "bg-blue-900/30", textColor: "text-blue-300", borderColor: "border-blue-700" },
    { value: "anxiety", label: "Anxiety", icon: "😰", color: "yellow", bgColor: "bg-yellow-900/30", textColor: "text-yellow-300", borderColor: "border-yellow-700" },
    { value: "depression", label: "Depression", icon: "😔", color: "indigo", bgColor: "bg-indigo-900/30", textColor: "text-indigo-300", borderColor: "border-indigo-700" },
    { value: "stress", label: "Stress", icon: "😤", color: "orange", bgColor: "bg-orange-900/30", textColor: "text-orange-300", borderColor: "border-orange-700" },
    { value: "relationships", label: "Relationships", icon: "❤️", color: "pink", bgColor: "bg-pink-900/30", textColor: "text-pink-300", borderColor: "border-pink-700" },
    { value: "addiction", label: "Addiction", icon: "🚫", color: "red", bgColor: "bg-red-900/30", textColor: "text-red-300", borderColor: "border-red-700" },
    { value: "trauma", label: "Trauma", icon: "🛡️", color: "purple", bgColor: "bg-purple-900/30", textColor: "text-purple-300", borderColor: "border-purple-700" },
    { value: "other", label: "Other", icon: "❓", color: "gray", bgColor: "bg-gray-800/30", textColor: "text-gray-300", borderColor: "border-gray-600" }
  ];

  const currentCategories = darkMode ? darkCategories : categories;

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest First", icon: Clock },
    { value: "oldest", label: "Oldest First", icon: Clock },
    { value: "most_answers", label: "Most Answers", icon: MessageSquare },
    { value: "most_views", label: "Most Views", icon: Eye },
    { value: "trending", label: "Trending", icon: TrendingUp }
  ];

  // PHASE 1: Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // PHASE 1: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC to close modals
      if (e.key === "Escape") {
        if (showNewQuestionForm) {
          handleCloseNewQuestionForm();
        } else if (selectedQuestion) {
          handleCloseQuestionDetail();
        } else if (reportDialog.show) {
          setReportDialog({ show: false, type: "", id: null, reason: "" });
        } else if (confirmDialog.show) {
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        }
      }
      
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector('input[aria-label="Search forum content"]')?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNewQuestionForm, selectedQuestion, reportDialog.show, confirmDialog.show]);

  // PHASE 1: Focus management for modals
  useEffect(() => {
    if (showNewQuestionForm && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [showNewQuestionForm]);

  // Fetch user data - FIXED: No dependencies to prevent re-creation
  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.AUTH.ME}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserType(response.data.user_type);
      setCurrentUserId(response.data.id);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []); // API_URL is a constant, safe to omit

  // Fetch questions - FIXED: Stable reference, reads latest state
  const fetchQuestions = useCallback(async (page = 1, append = false, category = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      // Use the category parameter if provided, otherwise read from state via setter
      const effectiveCategory = category !== null ? category : selectedCategory;

      const params = {
        category: effectiveCategory !== "all" ? effectiveCategory : undefined,
        limit: questionsPerPage,
        offset: (page - 1) * questionsPerPage
      };

      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      // Handle pagination metadata if available from backend
      const questionsData = Array.isArray(response.data) ? response.data : (response.data.questions || response.data);
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.total_pages || 1);
        setHasMore(response.data.pagination.has_next || false);
      }

      if (append) {
        setQuestions(prev => [...prev, ...questionsData]);
      } else {
        setQuestions(questionsData);
      }

      setCurrentPage(page);
      currentPageRef.current = page;
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - reads current state when needed

  // Fetch answers for a question
  const fetchAnswers = useCallback(async (questionId) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FORUM.ANSWERS_BY_QUESTION(questionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnswers(response.data);
    } catch (error) {
      console.error("Error fetching answers:", error);
      toast.error("Failed to load answers");
    }
  }, [API_URL]);

  // Filter and sort questions - PHASE 1: Use debounced search
  const processedQuestions = useMemo(() => {
    let filtered = questions;

    // Apply search filter with debounced query
    if (debouncedSearchQuery) {
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        q.content.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        q.author_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered = filtered.sort((a, b) => new Date(b.created_at || b.asked_at) - new Date(a.created_at || a.asked_at));
        break;
      case "oldest":
        filtered = filtered.sort((a, b) => new Date(a.created_at || a.asked_at) - new Date(b.created_at || b.asked_at));
        break;
      case "most_answers":
        filtered = filtered.sort((a, b) => (b.answers_count || 0) - (a.answers_count || 0));
        break;
      case "most_views":
        filtered = filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case "trending":
        filtered = filtered.sort((a, b) => {
          const aScore = (b.answers_count || 0) * 2 + (b.view_count || 0);
          const bScore = (a.answers_count || 0) * 2 + (a.view_count || 0);
          return aScore - bScore;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [questions, debouncedSearchQuery, sortBy]);

  // Start polling for real-time updates - FIXED: Uses refs to avoid re-creation
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(() => {
      // Only poll if user has been active recently (within last 5 minutes)
      const now = Date.now();
      const timeSinceLastActivity = now - lastUpdateRef.current;

      if (timeSinceLastActivity < 5 * 60 * 1000) { // 5 minutes
        // Use ref to get current page without dependency
        fetchQuestions(currentPageRef.current, false); // Silent refresh
      }
    }, 60000); // Poll every minute
  }, [fetchQuestions]); // fetchQuestions is now stable

  // Stop polling - FIXED: Stable reference
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastUpdateRef.current = Date.now();
  }, []);

  // Initialize data - FIXED: Only run once on mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      fetchUserData();
      fetchQuestions(1, false); // Start with page 1
      startPolling();
    }

    return () => {
      stopPolling();
      isMountedRef.current = false;
    };
  }, []); // Empty array = run once on mount only

  // FIXED: Separate effect for category changes
  useEffect(() => {
    if (isMountedRef.current) {
      // Only refetch if component is already mounted (not on first render)
      fetchQuestions(1, false, selectedCategory);
    }
  }, [selectedCategory]); // Only when category changes

  // Handle user activity
  useEffect(() => {
    const handleActivity = () => updateActivity();

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [updateActivity]);

  // PHASE 1: Handle closing new question form with confirmation
  const handleCloseNewQuestionForm = () => {
    if (formDirty && (newQuestion.title.trim() || newQuestion.content.trim())) {
      setConfirmDialog({
        show: true,
        title: "Discard Changes?",
        message: "You have unsaved changes. Are you sure you want to close this form?",
        onConfirm: () => {
          setShowNewQuestionForm(false);
          setNewQuestion({ title: "", content: "", category: "general", tags: "", is_anonymous: false, is_urgent: false });
          setFormDirty(false);
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        },
        type: "warning"
      });
    } else {
      setShowNewQuestionForm(false);
      setNewQuestion({ title: "", content: "", category: "general", tags: "", is_anonymous: false, is_urgent: false });
      setFormDirty(false);
    }
  };

  // PHASE 1: Handle closing question detail with confirmation
  const handleCloseQuestionDetail = () => {
    if (answerFormDirty && newAnswer.trim()) {
      setConfirmDialog({
        show: true,
        title: "Discard Answer?",
        message: "You have an unsaved answer. Are you sure you want to close this?",
        onConfirm: () => {
          setSelectedQuestion(null);
          setNewAnswer("");
          setAnswerFormDirty(false);
          setShowAnswerForm(false);
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        },
        type: "warning"
      });
    } else {
      setSelectedQuestion(null);
      setNewAnswer("");
      setAnswerFormDirty(false);
      setShowAnswerForm(false);
    }
  };

  // Handle question creation
  const handleCreateQuestion = async () => {
    // Enhanced validation
    if (!newQuestion.title.trim()) {
      toast.error("Please enter a question title");
      return;
    }
    if (newQuestion.title.trim().length < 5) {
      toast.error("Question title must be at least 5 characters long");
      return;
    }
    if (!newQuestion.content.trim()) {
      toast.error("Please provide question details");
      return;
    }
    if (newQuestion.content.trim().length < 10) {
      toast.error("Question details must be at least 10 characters long");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(`${API_URL}${API_ENDPOINTS.FORUM.QUESTIONS}`, newQuestion, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setQuestions([response.data, ...questions]);
      setNewQuestion({ title: "", content: "", category: "general", tags: "", is_anonymous: false, is_urgent: false });
      setShowNewQuestionForm(false);
      setFormDirty(false);
      toast.success("Question posted successfully!");
    } catch (error) {
      console.error("Error creating question:", error);

      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          toast.error("Please log in to post questions");
        } else if (status === 403) {
          toast.error("You don't have permission to post questions");
        } else if (status === 422) {
          // Validation errors
          const errors = errorData.errors || [];
          if (errors.length > 0) {
            toast.error(errors[0]); // Show first validation error
          } else {
            toast.error("Please check your input and try again");
          }
        } else if (status === 500) {
          toast.error("Server error. Please try again later");
        } else {
          toast.error(errorData.detail || "Failed to post question");
        }
      } else if (error.request) {
        toast.error("Network error. Please check your connection");
      } else {
        toast.error("Failed to post question");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle answer creation
  const handleCreateAnswer = async () => {
    if (!newAnswer.trim()) {
      toast.error("Please enter an answer");
      return;
    }
    if (newAnswer.trim().length < 10) {
      toast.error("Answer must be at least 10 characters long");
      return;
    }
    if (!selectedQuestion) {
      toast.error("No question selected");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.FORUM.ANSWER_CREATE(selectedQuestion.id)}`,
        { content: newAnswer.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnswers([...answers, response.data]);
      setNewAnswer("");
      setShowAnswerForm(false);
      setAnswerFormDirty(false);
      
      // Update question answer count
      setQuestions(questions.map(q => 
        q.id === selectedQuestion.id 
          ? { ...q, answers_count: (q.answers_count || 0) + 1 }
          : q
      ));
      
      toast.success("Answer posted successfully!");
    } catch (error) {
      console.error("Error creating answer:", error);

      // Enhanced error handling for answers
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          toast.error("Please log in to post answers");
        } else if (status === 403) {
          toast.error("Only specialists can post answers");
        } else if (status === 404) {
          toast.error("Question not found or no longer available");
        } else if (status === 422) {
          const errors = errorData.errors || [];
          if (errors.length > 0) {
            toast.error(errors[0]);
          } else {
            toast.error("Please check your answer and try again");
          }
        } else {
          toast.error(errorData.detail || "Failed to post answer");
        }
      } else if (error.request) {
        toast.error("Network error. Please check your connection");
      } else {
        toast.error("Failed to post answer");
      }
    } finally {
      setLoading(false);
    }
  };

  // PHASE 2: Handle question deletion with loading state
  const handleDeleteQuestion = (questionId) => {
    setConfirmDialog({
      show: true,
      title: "Delete Question?",
      message: "Are you sure you want to delete this question? This action cannot be undone.",
      onConfirm: async () => {
        setActionLoading(prev => ({ ...prev, deleteQuestion: questionId }));
        try {
          const token = localStorage.getItem("access_token");
          await axios.delete(`${API_URL}${API_ENDPOINTS.FORUM.QUESTION_DELETE(questionId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setQuestions(questions.filter(q => q.id !== questionId));
          if (selectedQuestion?.id === questionId) {
            setSelectedQuestion(null);
          }
          toast.success("Question deleted successfully");
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        } catch (error) {
          console.error("Error deleting question:", error);
          toast.error("Failed to delete question");
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        } finally {
          setActionLoading(prev => ({ ...prev, deleteQuestion: null }));
        }
      },
      type: "danger"
    });
  };

  // PHASE 2: Handle bookmark toggle with loading state
  const handleBookmarkToggle = async (questionId) => {
    setActionLoading(prev => ({ ...prev, bookmark: questionId }));
    
    // For now, just toggle local state and show notification
    // Backend bookmark endpoints need to be implemented
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
    
    const newBookmarked = new Set(bookmarkedQuestions);
    if (newBookmarked.has(questionId)) {
      newBookmarked.delete(questionId);
      toast.success("Question removed from bookmarks");
    } else {
      newBookmarked.add(questionId);
      toast.success("Question bookmarked");
    }
    setBookmarkedQuestions(newBookmarked);
    setActionLoading(prev => ({ ...prev, bookmark: null }));
  };

  // PHASE 2: Handle like answer
  const handleLikeAnswer = async (answerId) => {
    setActionLoading(prev => ({ ...prev, likeAnswer: answerId }));
    
    // Simulate API call - backend endpoint needs to be implemented
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newLiked = new Set(likedAnswers);
    if (newLiked.has(answerId)) {
      newLiked.delete(answerId);
      toast.success("Like removed");
    } else {
      newLiked.add(answerId);
      toast.success("Answer liked");
    }
    setLikedAnswers(newLiked);
    setActionLoading(prev => ({ ...prev, likeAnswer: null }));
  };

  // PHASE 1: Handle report question with custom modal
  const handleReportQuestion = (questionId) => {
    setReportDialog({
      show: true,
      type: "question",
      id: questionId,
      reason: ""
    });
  };

  // PHASE 1: Handle report answer with custom modal
  const handleReportAnswer = (answerId) => {
    setReportDialog({
      show: true,
      type: "answer",
      id: answerId,
      reason: ""
    });
  };

  // PHASE 1: Submit report
  const submitReport = async () => {
    if (!reportDialog.reason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API_URL}${API_ENDPOINTS.FORUM.REPORTS}`, {
        post_id: reportDialog.id,
        post_type: reportDialog.type,
        reason: reportDialog.reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${reportDialog.type === "question" ? "Question" : "Answer"} reported successfully`);
      setReportDialog({ show: false, type: "", id: null, reason: "" });
    } catch (error) {
      console.error("Error reporting:", error);
      toast.error(`Failed to report ${reportDialog.type}`);
    }
  };

  // Handle question editing
  const handleEditQuestion = (question) => {
    setEditingQuestion(question.id);
    setEditQuestionData({
      title: question.title,
      content: question.content,
      category: question.category,
      tags: question.tags || "",
      is_urgent: question.is_urgent || false
    });
  };

  const handleSaveQuestionEdit = async () => {
    if (!editQuestionData.title.trim() || !editQuestionData.content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.put(`${API_URL}${API_ENDPOINTS.FORUM.QUESTION_UPDATE(editingQuestion)}`, editQuestionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the question in the list
      setQuestions(questions.map(q => q.id === editingQuestion ? response.data : q));
      setEditingQuestion(null);
      toast.success("Question updated successfully!");
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQuestionEdit = () => {
    setEditingQuestion(null);
    setEditQuestionData({
      title: "",
      content: "",
      category: "general",
      tags: "",
      is_urgent: false
    });
  };

  // Handle answer editing
  const handleEditAnswer = (answer) => {
    setEditingAnswer(answer.id);
    setEditAnswerData(answer.content);
  };

  const handleSaveAnswerEdit = async () => {
    if (!editAnswerData.trim()) {
      toast.error("Please enter answer content");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.put(`${API_URL}${API_ENDPOINTS.FORUM.ANSWER_UPDATE(editingAnswer)}`, {
        content: editAnswerData.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the answer in the answers list
      setAnswers(answers.map(a => a.id === editingAnswer ? response.data : a));
      setEditingAnswer(null);
      setEditAnswerData("");
      toast.success("Answer updated successfully!");
    } catch (error) {
      console.error("Error updating answer:", error);
      toast.error("Failed to update answer");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAnswerEdit = () => {
    setEditingAnswer(null);
    setEditAnswerData("");
  };

  // PHASE 2: Handle answer deletion with loading state
  const handleDeleteAnswer = (answerId) => {
    setConfirmDialog({
      show: true,
      title: "Delete Answer?",
      message: "Are you sure you want to delete this answer? This action cannot be undone.",
      onConfirm: async () => {
        setActionLoading(prev => ({ ...prev, deleteAnswer: answerId }));
        try {
          const token = localStorage.getItem("access_token");
          await axios.delete(`${API_URL}${API_ENDPOINTS.FORUM.ANSWER_DELETE(answerId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setAnswers(answers.filter(a => a.id !== answerId));
          
          // Update question answer count
          setQuestions(questions.map(q => 
            q.id === selectedQuestion?.id 
              ? { ...q, answers_count: Math.max((q.answers_count || 0) - 1, 0) }
              : q
          ));
          
          toast.success("Answer deleted successfully");
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        } catch (error) {
          console.error("Error deleting answer:", error);
          toast.error("Failed to delete answer");
          setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
        } finally {
          setActionLoading(prev => ({ ...prev, deleteAnswer: null }));
        }
      },
      type: "danger"
    });
  };

  // Handle question view
  const handleViewQuestion = async (question) => {
    setSelectedQuestion(question);
    await fetchAnswers(question.id);
    setExpandedQuestion(question.id);
  };

  // Get category info
  const getCategoryInfo = (categoryValue) => {
    return currentCategories.find(cat => cat.value === categoryValue) || currentCategories[0];
  };

  // PHASE 4: Enhanced time formatting
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Unknown";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // PHASE 1: Custom Confirmation Dialog Component
  const ConfirmationDialog = () => {
    if (!confirmDialog.show) return null;

    const colors = {
      danger: {
        bg: "bg-red-600",
        hover: "hover:bg-red-700",
        text: "text-red-600"
      },
      warning: {
        bg: "bg-yellow-600",
        hover: "hover:bg-yellow-700",
        text: "text-yellow-600"
      },
      info: {
        bg: "bg-blue-600",
        hover: "hover:bg-blue-700",
        text: "text-blue-600"
      }
    };

    const colorScheme = colors[confirmDialog.type] || colors.danger;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={() => setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" })}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-md rounded-2xl ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-full ${colorScheme.text} bg-opacity-10`}>
                <AlertCircle size={24} />
              </div>
              <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                {confirmDialog.title}
              </h3>
            </div>
            
            <p className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              {confirmDialog.message}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, type: "danger" })}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl font-medium text-white transition-colors ${colorScheme.bg} ${colorScheme.hover}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // PHASE 1: Custom Report Dialog Component - FIXED: Optimized to prevent UI flash
  const ReportDialog = () => {
    if (!reportDialog.show) return null;

    // FIXED: Use functional update to prevent re-renders
    const handleReasonChange = useCallback((e) => {
      const newReason = e.target.value;
      setReportDialog(prev => ({ ...prev, reason: newReason }));
    }, []);

    // Handle browser extension conflicts (Grammarly, etc.)
    useEffect(() => {
      if (reportDialog.show) {
        // Suppress Grammarly and other extension errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
          const message = args.join(' ');
          // Filter out Grammarly extension errors
          if (message.includes('Grammarly') || 
              message.includes('grm ERROR') || 
              message.includes('iterable') ||
              message.includes('moz-extension://')) {
            return; // Suppress these errors
          }
          originalConsoleError.apply(console, args);
        };

        return () => {
          console.error = originalConsoleError;
        };
      }
    }, [reportDialog.show]);

    const closeDialog = useCallback(() => {
      setReportDialog({ show: false, type: "", id: null, reason: "" });
    }, []);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={closeDialog}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-md rounded-2xl ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Report {reportDialog.type === "question" ? "Question" : "Answer"}
              </h3>
              <button
                onClick={closeDialog}
                className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                aria-label="Close report dialog"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Reason for reporting <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reportDialog.reason}
                onChange={handleReasonChange}
                placeholder="Please explain why you're reporting this content..."
                rows={4}
                maxLength={500}
                className={`w-full p-3 rounded-xl border transition-colors ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                } resize-none`}
                autoFocus
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
              <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {reportDialog.reason.length}/500 characters
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDialog}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportDialog.reason.trim()}
                className={`px-4 py-2 rounded-xl font-medium text-white transition-colors ${
                  reportDialog.reason.trim()
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Submit Report
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Question card component
  const QuestionCard = ({ question, isExpanded }) => {
    const categoryInfo = getCategoryInfo(question.category);
    const isOwner = currentUserId === question.author_id;
    const canAnswer = userType === "specialist";
    const isBookmarked = bookmarkedQuestions.has(question.id);
    const isEditing = editingQuestion === question.id;
    const isDeleting = actionLoading.deleteQuestion === question.id;
    const isBookmarking = actionLoading.bookmark === question.id;

    // PHASE 2: Check if question was edited
    const isQuestionEdited = question.updated_at && question.updated_at !== question.created_at;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2 }}
        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
          darkMode 
            ? "bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-xl hover:shadow-gray-900/20" 
            : "bg-white/80 border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50"
        } backdrop-blur-sm`}
      >
        {/* Urgent indicator */}
        {question.is_urgent && !isEditing && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center space-x-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              <AlertCircle size={12} />
              <span>Urgent</span>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                <span className="text-2xl" role="img" aria-label={categoryInfo.label}>{categoryInfo.icon}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryInfo.bgColor} ${categoryInfo.textColor} ${categoryInfo.borderColor}`}>
                  {categoryInfo.label}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  question.status === "open" 
                    ? "bg-green-100 text-green-700 border border-green-200" 
                    : question.status === "answered"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}>
                  {question.status}
                </span>
              </div>
              
              {/* PHASE 2: Edited indicator for questions */}
              {!isEditing && isQuestionEdited && (
                <div className="mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                  }`} title={`Last edited: ${formatTimeAgo(question.updated_at)}`}>
                    Edited
                  </span>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editQuestionData.title}
                      onChange={(e) => setEditQuestionData({...editQuestionData, title: e.target.value})}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                      }`}
                      placeholder="Question title..."
                      maxLength="200"
                    />
                    <div className={`text-right text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {editQuestionData.title.length}/200
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editQuestionData.content}
                      onChange={(e) => setEditQuestionData({...editQuestionData, content: e.target.value})}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                      }`}
                      rows="4"
                      placeholder="Describe your question in detail..."
                      maxLength="2000"
                    />
                    <div className={`text-right text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {editQuestionData.content.length}/2000
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Category
                      </label>
                      <select
                        value={editQuestionData.category}
                        onChange={(e) => setEditQuestionData({...editQuestionData, category: e.target.value})}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        {currentCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Tags
                      </label>
                      <input
                        type="text"
                        value={editQuestionData.tags}
                        onChange={(e) => setEditQuestionData({...editQuestionData, tags: e.target.value})}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                        }`}
                        placeholder="Tags (optional)..."
                        maxLength="100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`urgent-${question.id}`}
                      checked={editQuestionData.is_urgent}
                      onChange={(e) => setEditQuestionData({...editQuestionData, is_urgent: e.target.checked})}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`urgent-${question.id}`} className={`ml-2 block text-sm ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                      Mark as urgent
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveQuestionEdit}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Save question edits"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancelQuestionEdit}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className={`text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {question.title}
                  </h3>

                  <p className={`text-sm leading-relaxed line-clamp-3 mb-3 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}>
                    {question.content}
                  </p>

                  {/* PHASE 4: Display tags */}
                  {question.tags && question.tags.trim() && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {question.tags.split(',').slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className={`text-xs px-2 py-1 rounded-full ${
                            darkMode 
                              ? "bg-gray-700 text-gray-300 border border-gray-600" 
                              : "bg-gray-100 text-gray-600 border border-gray-300"
                          }`}
                        >
                          #{tag.trim()}
                        </span>
                      ))}
                      {question.tags.split(',').length > 3 && (
                        <span className={`text-xs px-2 py-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          +{question.tags.split(',').length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            {!isEditing && (
              <div className="flex items-center space-x-2">
                {/* PHASE 2: Bookmark with loading state */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmarkToggle(question.id);
                  }}
                  disabled={isBookmarking || isDeleting}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isBookmarked
                      ? "text-yellow-500 hover:text-yellow-600"
                      : darkMode
                        ? "text-gray-400 hover:text-white hover:bg-gray-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  } ${isBookmarking || isDeleting ? "opacity-50" : ""}`}
                  title={isBookmarked ? "Remove bookmark" : "Bookmark question"}
                  aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}
                >
                  {isBookmarking ? (
                    <div className="animate-spin">
                      <Clock size={16} />
                    </div>
                  ) : (
                    <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportQuestion(question.id);
                  }}
                  disabled={isDeleting}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? "text-gray-400 hover:text-white hover:bg-gray-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  } ${isDeleting ? "opacity-50" : ""}`}
                  title="Report question"
                  aria-label="Report question"
                >
                  <Flag size={16} />
                </button>

                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditQuestion(question);
                    }}
                    disabled={isDeleting}
                    className={`p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors ${isDeleting ? "opacity-50" : ""}`}
                    title="Edit question"
                    aria-label="Edit question"
                  >
                    <Edit3 size={16} />
                  </button>
                )}

                {/* PHASE 2: Delete button with loading state */}
                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(question.id);
                    }}
                    disabled={isDeleting}
                    className={`p-2 text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors ${isDeleting ? "opacity-50" : ""}`}
                    title="Delete question"
                    aria-label="Delete question"
                  >
                    {isDeleting ? (
                      <div className="animate-spin">
                        <Clock size={16} />
                      </div>
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewQuestion(question);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? "text-gray-400 hover:text-white hover:bg-gray-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title="View details"
                  aria-label="View question details"
                >
                  <MessageCircle size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <User size={14} />
                <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {question.is_anonymous ? "Anonymous" : question.author_name}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {formatTimeAgo(question.created_at || question.asked_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <MessageSquare size={14} />
                <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {question.answers_count || 0}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Eye size={14} />
                <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {question.view_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // PHASE 4: Enhanced Skeleton loader component with shimmer effect
  const SkeletonCard = () => (
    <div className={`p-6 rounded-2xl border relative overflow-hidden ${
      darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white/80 border-gray-200"
    }`}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
            <div className={`h-6 w-24 rounded-full animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
            <div className={`h-6 w-16 rounded-full animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
          </div>
          <div className={`h-6 w-3/4 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
          <div className={`h-4 w-full rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
          <div className={`h-4 w-5/6 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
        </div>
      </div>
      <div className={`flex items-center justify-between pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex space-x-4">
          <div className={`h-4 w-20 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
          <div className={`h-4 w-16 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
        </div>
        <div className="flex space-x-4">
          <div className={`h-4 w-12 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
          <div className={`h-4 w-12 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
        </div>
      </div>
    </div>
  );

  // Answer card component
  const AnswerCard = ({ answer }) => {
    const isAnswerOwner = currentUserId === answer.specialist_id;
    const isEditingAnswer = editingAnswer === answer.id;
    const isLiked = likedAnswers.has(answer.id);
    const isDeleting = actionLoading.deleteAnswer === answer.id;
    const isLiking = actionLoading.likeAnswer === answer.id;

    // PHASE 2: Check if answer was edited
    const isEdited = answer.updated_at && answer.updated_at !== answer.created_at;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border ${
          darkMode
            ? "bg-gray-700/50 border-gray-600"
            : "bg-gray-50 border-gray-200"
        } ${isDeleting ? "opacity-50" : ""}`}
      >
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${
            darkMode ? "bg-blue-600" : "bg-blue-500"
          }`}>
            <Award size={16} className="text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2 flex-wrap gap-1">
              <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                {answer.specialist_name}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700"
              }`}>
                Specialist
              </span>
              {/* PHASE 2: Edited indicator */}
              {isEdited && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  darkMode ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"
                }`} title={`Last edited: ${formatTimeAgo(answer.updated_at)}`}>
                  Edited
                </span>
              )}
            </div>

            {isEditingAnswer ? (
              <div className="space-y-3">
                <textarea
                  value={editAnswerData}
                  onChange={(e) => setEditAnswerData(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                  }`}
                  rows="3"
                  placeholder="Your answer..."
                  maxLength="2000"
                />
                <div className={`text-right text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {editAnswerData.length}/2000
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAnswerEdit}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    aria-label="Save answer edits"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelAnswerEdit}
                    className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    aria-label="Cancel editing answer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}>
                {answer.content}
              </p>
            )}

            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {formatTimeAgo(answer.answered_at || answer.created_at)}
              </span>

              <div className="flex items-center space-x-2">
                {/* PHASE 2: Like button with state */}
                <button 
                  onClick={() => handleLikeAnswer(answer.id)}
                  disabled={isLiking}
                  className={`p-1 transition-all duration-200 ${
                    isLiked
                      ? "text-red-500"
                      : darkMode 
                        ? "text-gray-400 hover:text-red-400" 
                        : "text-gray-500 hover:text-red-500"
                  } ${isLiking ? "opacity-50" : ""}`}
                  aria-label={isLiked ? "Unlike answer" : "Like answer"}
                  title={isLiked ? "Unlike answer" : "Like answer"}
                >
                  <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>

                {isAnswerOwner && !isEditingAnswer && (
                  <button
                    onClick={() => handleEditAnswer(answer)}
                    disabled={isDeleting}
                    className={`p-1 transition-colors ${darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-blue-500"} ${isDeleting ? "opacity-50" : ""}`}
                    title="Edit answer"
                    aria-label="Edit answer"
                  >
                    <Edit3 size={14} />
                  </button>
                )}

                {isAnswerOwner && (
                  <button
                    onClick={() => handleDeleteAnswer(answer.id)}
                    disabled={isDeleting}
                    className={`p-1 transition-colors ${darkMode ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"} ${isDeleting ? "opacity-50" : ""}`}
                    title="Delete answer"
                    aria-label="Delete answer"
                  >
                    {isDeleting ? (
                      <div className="animate-spin">
                        <Clock size={14} />
                      </div>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                )}

                <button
                  onClick={() => handleReportAnswer(answer.id)}
                  disabled={isDeleting}
                  className={`p-1 transition-colors ${darkMode ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"} ${isDeleting ? "opacity-50" : ""}`}
                  title="Report answer"
                  aria-label="Report answer"
                >
                  <Flag size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Main component return
  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* PHASE 1: Custom scrollbar styles - WIDER & More Visible */}
      <style>{`
        /* Main page scrollbar - WIDER for better visibility */
        body::-webkit-scrollbar,
        .custom-scrollbar::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }
        body::-webkit-scrollbar-track,
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${darkMode ? '#1f2937' : '#e5e7eb'};
          border-radius: 8px;
          margin: 4px;
        }
        body::-webkit-scrollbar-thumb,
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#4b5563' : '#9ca3af'};
          border-radius: 8px;
          border: 3px solid ${darkMode ? '#1f2937' : '#e5e7eb'};
        }
        body::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#6b7280' : '#6b7280'};
        }
        body::-webkit-scrollbar-thumb:active,
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: ${darkMode ? '#9ca3af' : '#4b5563'};
        }
        
        /* Firefox scrollbar - AUTO width (wider) */
        * {
          scrollbar-width: auto;
          scrollbar-color: ${darkMode ? '#4b5563 #1f2937' : '#9ca3af #e5e7eb'};
        }
        
        /* PHASE 3: Focus visible styles for accessibility */
        *:focus-visible {
          outline: 2px solid ${darkMode ? '#60a5fa' : '#3b82f6'};
          outline-offset: 2px;
          border-radius: 4px;
        }
        
        /* PHASE 4: Shimmer animation for skeleton loader */
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        
        /* PHASE 4: Smooth transitions for all interactive elements */
        button, a, input, select, textarea {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PHASE 3: Sticky Header - Fixed */}
        <div className="sticky top-0 z-40 pb-4 mb-4" style={{
          background: darkMode 
            ? 'linear-gradient(to bottom, #111827 0%, #111827 90%, rgba(17, 24, 39, 0.8) 95%, transparent 100%)'
            : 'linear-gradient(to bottom, #f9fafb 0%, #f9fafb 90%, rgba(249, 250, 251, 0.8) 95%, transparent 100%)'
        }}>
          {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-4xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Community Forum
              </h1>
              <p className={`text-lg mt-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Ask questions, share experiences, and get support from our community
              </p>
            </div>
            
            {userType === "patient" && (
              <button
                onClick={() => setShowNewQuestionForm(true)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/25"
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                } hover:scale-105`}
                aria-label="Ask a new question"
              >
                <Plus size={20} />
                <span>Ask Question</span>
              </button>
            )}
          </div>

          {/* PHASE 3: Responsive Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search 
                size={20} 
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`} 
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search questions, answers, or users... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search forum content"
                role="searchbox"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                }`}
              />
            </div>

            {/* PHASE 3: Responsive Filters */}
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by category"
                className={`flex-1 sm:flex-none min-w-[140px] px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
              >
                <option value="all">All Categories</option>
                {currentCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort questions"
                className={`flex-1 sm:flex-none min-w-[140px] px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className={`px-3 sm:px-4 py-3 rounded-xl border transition-colors flex items-center justify-center space-x-2 min-w-[44px] ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                }`}
                aria-label={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
                aria-pressed={viewMode === "list"}
                title={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
              >
                {viewMode === "grid" ? <List size={18} aria-hidden="true" /> : <Grid size={18} aria-hidden="true" />}
                <span className="hidden md:inline">{viewMode === "grid" ? "List" : "Grid"}</span>
              </button>
            </div>
          </div>
        </div>
        {/* End of Sticky Header */}
        </div>

        {/* PHASE 3: Responsive Stats Grid - Scrollable Content */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* PHASE 3: Improved stat card with better responsive design */}
          <div className={`p-3 sm:p-4 rounded-xl border ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`} role="status" aria-label="Total questions count">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg shrink-0">
                <MessageCircle size={18} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className={`text-xl sm:text-2xl font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {processedQuestions.length}
                </p>
                <p className={`text-xs sm:text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Questions
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3 sm:p-4 rounded-xl border ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`} role="status" aria-label="Answered questions count">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-green-500 rounded-lg shrink-0">
                <CheckCircle size={18} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className={`text-xl sm:text-2xl font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {processedQuestions.filter(q => q.status === "answered").length}
                </p>
                <p className={`text-xs sm:text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Answered
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3 sm:p-4 rounded-xl border ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`} role="status" aria-label="Open questions count">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-orange-500 rounded-lg shrink-0">
                <Clock size={18} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className={`text-xl sm:text-2xl font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {processedQuestions.filter(q => q.status === "open").length}
                </p>
                <p className={`text-xs sm:text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Open
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3 sm:p-4 rounded-xl border ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`} role="status" aria-label="Total answers count">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-purple-500 rounded-lg shrink-0">
                <TrendingUp size={18} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className={`text-xl sm:text-2xl font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {processedQuestions.reduce((sum, q) => sum + (q.answers_count || 0), 0)}
                </p>
                <p className={`text-xs sm:text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Answers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 2: Search status indicator */}
        {debouncedSearchQuery && searchQuery !== debouncedSearchQuery && (
          <div className="mb-4 flex items-center justify-center">
            <div className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm">Searching...</span>
              </div>
            </div>
          </div>
        )}

        {/* Questions Grid/List with skeleton loading */}
        {loading ? (
          <div className={`${
            viewMode === "grid" 
              ? "grid grid-cols-1 lg:grid-cols-2 gap-6" 
              : "space-y-4"
          }`}>
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className={`${
            viewMode === "grid" 
              ? "grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6" 
              : "space-y-4"
          }`} role="list" aria-label="Forum questions">
            <AnimatePresence>
              {processedQuestions.map((question) => (
                <div key={question.id} role="listitem">
                  <QuestionCard 
                    question={question}
                    isExpanded={expandedQuestion === question.id}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {processedQuestions.length === 0 && !loading && (
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              darkMode ? "bg-gray-800" : "bg-gray-100"
            }`}>
              <MessageCircle size={32} className={darkMode ? "text-gray-400" : "text-gray-500"} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              No questions found
            </h3>
            <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {debouncedSearchQuery ? "Try adjusting your search criteria" : "Be the first to ask a question!"}
            </p>
          </div>
        )}

        {/* PHASE 3: Improved Pagination with accessibility */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center mt-8 space-x-2" aria-label="Pagination navigation" role="navigation">
            <button
              onClick={() => {
                fetchQuestions(currentPage - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1 || loading}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 1 || loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
              aria-label="Go to previous page"
              aria-disabled={currentPage === 1 || loading}
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <span className={`px-2 sm:px-4 py-2 text-sm sm:text-base ${darkMode ? "text-gray-300" : "text-gray-700"}`} aria-current="page" aria-label={`Page ${currentPage} of ${totalPages}`}>
              <span className="hidden sm:inline">Page </span>{currentPage} / {totalPages}
            </span>

            <button
              onClick={() => {
                fetchQuestions(currentPage + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages || loading || !hasMore}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === totalPages || loading || !hasMore
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
              aria-label="Go to next page"
              aria-disabled={currentPage === totalPages || loading || !hasMore}
            >
              Next
            </button>
          </nav>
        )}

        {/* Load More Button (Alternative to pagination) */}
        {hasMore && totalPages <= 1 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => fetchQuestions(currentPage + 1, true)}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 shadow-lg"
                    : "bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 shadow-lg"
              }`}
              aria-label="Load more questions"
            >
              {loading ? "Loading..." : "Load More Questions"}
            </button>
          </div>
        )}

        {/* PHASE 1: New Question Modal with fixed height and proper scrolling */}
        <AnimatePresence>
          {showNewQuestionForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={handleCloseNewQuestionForm}
            >
              <motion.div
                ref={newQuestionModalRef}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl ${
                  darkMode ? "bg-gray-800" : "bg-white"
                } shadow-2xl`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Fixed */}
                <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Ask a Question
                    </h2>
                    <button
                      onClick={handleCloseNewQuestionForm}
                      className={`p-2 rounded-lg ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                      aria-label="Close dialog"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Question Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={firstInputRef}
                        type="text"
                        placeholder="What's your question?"
                        value={newQuestion.title}
                        onChange={(e) => {
                          setNewQuestion({...newQuestion, title: e.target.value});
                          setFormDirty(true);
                        }}
                        maxLength={500}
                        aria-label="Question title"
                        aria-describedby="title-counter"
                        className={`w-full p-3 rounded-xl border transition-colors ${
                          darkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                      <div id="title-counter" className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {newQuestion.title.length}/500 characters
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newQuestion.category}
                        onChange={(e) => {
                          setNewQuestion({...newQuestion, category: e.target.value});
                          setFormDirty(true);
                        }}
                        className={`w-full p-3 rounded-xl border transition-colors ${
                          darkMode
                            ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        }`}
                      >
                        {currentCategories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Question Details <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        placeholder="Provide more details about your question..."
                        value={newQuestion.content}
                        onChange={(e) => {
                          setNewQuestion({...newQuestion, content: e.target.value});
                          setFormDirty(true);
                        }}
                        rows={6}
                        maxLength={5000}
                        className={`w-full p-3 rounded-xl border transition-colors resize-none ${
                          darkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                      <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {newQuestion.content.length}/5000 characters
                      </div>
                    </div>

                    {/* PHASE 4: Tags input */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Tags (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., anxiety, coping, therapy (comma-separated)"
                        value={newQuestion.tags}
                        onChange={(e) => {
                          setNewQuestion({...newQuestion, tags: e.target.value});
                          setFormDirty(true);
                        }}
                        maxLength={200}
                        className={`w-full p-3 rounded-xl border transition-colors ${
                          darkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        }`}
                      />
                      <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Separate tags with commas • {newQuestion.tags.length}/200 characters
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newQuestion.is_anonymous}
                          onChange={(e) => {
                            setNewQuestion({...newQuestion, is_anonymous: e.target.checked});
                            setFormDirty(true);
                          }}
                          className="rounded h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Post anonymously
                        </span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newQuestion.is_urgent}
                          onChange={(e) => {
                            setNewQuestion({...newQuestion, is_urgent: e.target.checked});
                            setFormDirty(true);
                          }}
                          className="rounded h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Mark as urgent
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer - Fixed */}
                <div className={`p-6 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCloseNewQuestionForm}
                      className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateQuestion}
                      disabled={loading}
                      className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                        loading
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : darkMode
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {loading ? "Posting..." : "Post Question"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 1: Question Detail Modal with fixed height and proper scrolling */}
        <AnimatePresence>
          {selectedQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={handleCloseQuestionDetail}
            >
              <motion.div
                ref={questionDetailModalRef}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl ${
                  darkMode ? "bg-gray-800" : "bg-white"
                } shadow-2xl`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Fixed */}
                <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-wrap gap-2">
                      <span className="text-2xl" role="img" aria-label={getCategoryInfo(selectedQuestion.category).label}>
                        {getCategoryInfo(selectedQuestion.category).icon}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        getCategoryInfo(selectedQuestion.category).bgColor
                      } ${getCategoryInfo(selectedQuestion.category).textColor} ${
                        getCategoryInfo(selectedQuestion.category).borderColor
                      }`}>
                        {getCategoryInfo(selectedQuestion.category).label}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleCloseQuestionDetail}
                      className={`p-2 rounded-lg ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                      aria-label="Close dialog"
                    >
                      <X size={20} />
                    </button>
                  </div>

                    <h2 className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {selectedQuestion.title}
                    </h2>

                    <div className="flex items-center flex-wrap gap-4 text-sm mb-4">
                      <div className="flex items-center space-x-2">
                        <User size={16} aria-hidden="true" />
                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                          {selectedQuestion.is_anonymous ? "Anonymous" : selectedQuestion.author_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock size={16} aria-hidden="true" />
                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                          {formatTimeAgo(selectedQuestion.created_at || selectedQuestion.asked_at)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Eye size={16} aria-hidden="true" />
                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                          {selectedQuestion.view_count || 0} views
                        </span>
                      </div>
                    </div>

                    {/* PHASE 4: Display tags in modal */}
                    {selectedQuestion.tags && selectedQuestion.tags.trim() && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedQuestion.tags.split(',').map((tag, index) => (
                          <span
                            key={index}
                            className={`text-xs px-3 py-1 rounded-full ${
                              darkMode 
                                ? "bg-gray-700 text-gray-300 border border-gray-600" 
                                : "bg-gray-100 text-gray-600 border border-gray-300"
                            }`}
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Question Content */}
                    <div className={`p-4 rounded-xl mb-6 ${
                      darkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}>
                      <p className={`leading-relaxed whitespace-pre-wrap ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {selectedQuestion.content}
                      </p>
                    </div>

                  {/* Answers Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        Answers ({answers.length})
                      </h3>
                      
                      {userType === "specialist" && (
                        <button
                          onClick={() => setShowAnswerForm(!showAnswerForm)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                            darkMode
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }`}
                          aria-label={showAnswerForm ? "Cancel answering" : "Add answer"}
                        >
                          <Plus size={16} />
                          <span>{showAnswerForm ? "Cancel" : "Add Answer"}</span>
                        </button>
                      )}
                    </div>

                    {/* Answer Form */}
                    {showAnswerForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mb-6 p-4 rounded-xl border ${
                          darkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <textarea
                          placeholder="Write your answer..."
                          value={newAnswer}
                          onChange={(e) => {
                            setNewAnswer(e.target.value);
                            setAnswerFormDirty(true);
                          }}
                          rows={4}
                          maxLength={3000}
                          className={`w-full p-3 rounded-xl border transition-colors mb-2 resize-none ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          }`}
                        />
                        <div className={`text-xs mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {newAnswer.length}/3000 characters
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setShowAnswerForm(false);
                              setAnswerFormDirty(false);
                            }}
                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                              darkMode
                                ? "bg-gray-700 hover:bg-gray-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateAnswer}
                            disabled={loading}
                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                              loading
                                ? "bg-gray-400 cursor-not-allowed text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          >
                            {loading ? "Posting..." : "Post Answer"}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Answers List */}
                    <div className="space-y-4">
                      {answers.map((answer) => (
                        <AnswerCard key={answer.id} answer={answer} />
                      ))}
                    </div>

                    {answers.length === 0 && (
                      <div className="text-center py-8">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                          <MessageSquare size={32} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                        </div>
                        <h4 className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                          No answers yet
                        </h4>
                        <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                          {userType === "specialist" 
                            ? "Be the first to help by providing an answer"
                            : "Specialists will answer your question soon"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 1: Confirmation and Report Dialogs */}
        <AnimatePresence>
          {confirmDialog.show && <ConfirmationDialog />}
          {reportDialog.show && <ReportDialog />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ModernForumModule;
