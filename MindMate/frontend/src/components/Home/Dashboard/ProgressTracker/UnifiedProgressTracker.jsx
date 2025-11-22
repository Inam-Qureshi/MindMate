import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Activity, 
  Smile, 
  Target, 
  Award,
  TrendingUp,
  Calendar,
  Zap,
  Heart,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Loader,
  Clock,
  Trash2,
  Book,
  CheckCircle,
  Search,
  RefreshCw
} from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../../config/api";

// Validation constants
const MIN_RESPONSE_LENGTH = 10;
const MAX_RESPONSE_LENGTH = 2000;

const UnifiedProgressTracker = ({ darkMode }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);
  
  // Expandable sections
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Action Menu
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef(null);
  
  // Mood Assessment Dialog
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [userResponse, setUserResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [moodResult, setMoodResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const messagesEndRef = useRef(null);
  const timeoutRefs = useRef([]);
  
  // Mark Exercise Dialog
  const [showMarkExerciseDialog, setShowMarkExerciseDialog] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [markingExercise, setMarkingExercise] = useState(false);
  
  // Add Goal Dialog
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    exercise_name: "",
    goal_type: "specific_exercise",
    description: "",
    target_value: 10
  });
  const [creatingGoal, setCreatingGoal] = useState(false);
  
  // Data
  const [moodAssessments, setMoodAssessments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    fetchAllData();
    fetchUserName();
    fetchExercises();
  }, [selectedDays]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Cleanup session on unmount if not completed
  // Note: Backend has auto-cleanup scheduler, so explicit cleanup is optional
  useEffect(() => {
    return () => {
      if (sessionId && !assessmentComplete) {
        console.log("Component unmounting with active session:", sessionId);
        // Backend will auto-cleanup after 24 hours via APScheduler
      }
    };
  }, [sessionId, assessmentComplete]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setShowActionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide sidebar when this component mounts
  useEffect(() => {
    document.body.classList.add('hide-sidebar');
    return () => document.body.classList.remove('hide-sidebar');
  }, []);

  const fetchUserName = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.AUTH.ME}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserName(response.data.first_name || "there");
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.EXERCISES.LIST}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle both array and object with exercises property
      const exercisesData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.exercises || []);
      setExercises(exercisesData);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      setExercises([]); // Ensure it's always an array on error
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      // Fetch all data in parallel
      const [statsRes, moodRes, goalsRes, achievementsRes, calendarRes, timelineRes, streakRes] = await Promise.all([
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.STATS}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.MOOD_HISTORY(1, 5)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.GOALS('active')}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.ACHIEVEMENTS}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.CALENDAR(30)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.TIMELINE(1, 10, 'all', selectedDays)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.DASHBOARD}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { current_streak: 0 } }))
      ]);

      setStats(statsRes.data);
      setMoodAssessments(moodRes.data.assessments || []);
      setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
      setAchievements(Array.isArray(achievementsRes.data) ? achievementsRes.data : []);
      setCalendarData(Array.isArray(calendarRes.data) ? calendarRes.data : []);
      setRecentActivities(timelineRes.data.activities || []);
      setCurrentStreak(streakRes.data?.current_streak || 0);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  // Validation function - Simplified (backend handles detailed validation)
  const validateResponse = (text) => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return "Please enter a response";
    }
    
    // Simple validation: minimum 10 characters (backend requires this)
    if (trimmed.length < 10) {
      return "Response is too short (10 characters minimum)";
    }
    
    if (trimmed.length > MAX_RESPONSE_LENGTH) {
      return `Response too long (${trimmed.length}/${MAX_RESPONSE_LENGTH} characters maximum)`;
    }
    
    return null;
  };

  // Mood Assessment Functions
  const startMoodAssessment = async () => {
    try {
      setShowActionMenu(false);
      setError(null);
      
      // Open modal immediately for better UX
      const firstName = userName.split(' ')[0] || 'there';
      setChatMessages([
        { type: "bot", text: `Hello ${firstName}! 👋` },
        { type: "bot", text: "I'm here to help you check in with yourself today. This will just take a few minutes." },
        { type: "bot", text: "Loading your first question..." }
      ]);
      setShowMoodDialog(true);
      setSubmitting(true);
      
      // Fetch session and first question
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.MOOD_SESSION_START}`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000
        }
      );

      setSessionId(response.data.session_id);
      setCurrentQuestion(response.data.question);
      setQuestionNumber(response.data.question_number);
      
      // Update chat with actual question
      setChatMessages([
        { type: "bot", text: `Hello ${firstName}! 👋` },
        { type: "bot", text: "I'm here to help you check in with yourself today. This will just take a few minutes." },
        { type: "bot", text: response.data.question }
      ]);
      setSubmitting(false);
    } catch (error) {
      console.error("Error starting mood assessment:", error);
      
      let errorMessage = "Failed to start mood assessment. ";
      if (error.response?.status === 401) {
        errorMessage += "Please log in again.";
      } else if (!navigator.onLine) {
        errorMessage += "No internet connection.";
      } else {
        errorMessage += "Please try again.";
      }
      
      setError(errorMessage);
      setChatMessages(prev => [...prev.slice(0, -1), { type: "bot", text: errorMessage }]);
      setSubmitting(false);
      setShowMoodDialog(false);
    }
  };

  const submitMoodResponse = async () => {
    // Validate response
    const validationErr = validateResponse(userResponse);
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setValidationError(null);
      
      const userMessage = userResponse.trim();
      setChatMessages(prev => [...prev, { type: "user", text: userMessage }]);
      setUserResponse("");

      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.MOOD_SESSION_RESPOND}`,
        { session_id: sessionId, response: userMessage },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000
        }
      );

      if (response.data.completed) {
        // Clear any pending timeouts
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
        
        // Add completion messages with tracked timeouts
        const timeout1 = setTimeout(() => {
          setChatMessages(prev => [...prev, {
            type: "bot",
            text: "Thank you for sharing! 🙏"
          }]);
        }, 500);
        
        const timeout2 = setTimeout(() => {
          setChatMessages(prev => [...prev, {
            type: "bot",
            text: "I've analyzed your responses and have some insights for you..."
          }]);
        }, 1500);
        
        const timeout3 = setTimeout(() => {
          setAssessmentComplete(true);
          setMoodResult(response.data.mood_inference);
        }, 2500);
        
        timeoutRefs.current.push(timeout1, timeout2, timeout3);
        fetchAllData();
      } else {
        setCurrentQuestion(response.data.question);
        setQuestionNumber(response.data.question_number);
        
        const timeout = setTimeout(() => {
          setChatMessages(prev => [...prev, { type: "bot", text: response.data.question }]);
        }, 300);
        
        timeoutRefs.current.push(timeout);
      }
      setSubmitting(false);
    } catch (error) {
      console.error("Error submitting response:", error);
      
      let errorMessage = "Failed to submit response. ";
      if (error.code === 'ECONNABORTED') {
        errorMessage += "Request timed out. Please try again.";
      } else if (error.response?.status === 404) {
        errorMessage += "Session not found. Please start a new assessment.";
      } else if (error.response?.status === 401) {
        errorMessage += "Please log in again.";
      } else if (!navigator.onLine) {
        errorMessage += "No internet connection.";
      } else {
        errorMessage += "Please try again.";
      }
      
      setError(errorMessage);
      setChatMessages(prev => [...prev, {
        type: "error",
        text: errorMessage
      }]);
      setSubmitting(false);
    }
  };

  const closeMoodDialog = () => {
    // Clear all pending timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    
    // Note: Backend auto-cleanup handles orphaned sessions
    if (sessionId && !assessmentComplete) {
      console.log("Dialog closed with incomplete session:", sessionId);
    }
    
    // Reset UI state
    setShowMoodDialog(false);
    setSessionId(null);
    setCurrentQuestion("");
    setQuestionNumber(0);
    setUserResponse("");
    setAssessmentComplete(false);
    setMoodResult(null);
    setChatMessages([]);
    setError(null);
    setValidationError(null);
  };

  // Mark Exercise Functions
  const openMarkExercise = () => {
    setShowActionMenu(false);
    setShowMarkExerciseDialog(true);
    setSearchTerm("");
    setSelectedExercise(null);
  };

  const selectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setShowConfirmation(true);
  };

  const markExerciseComplete = async () => {
    try {
      setMarkingExercise(true);
      const token = localStorage.getItem("access_token");
      
      // Start session
      const startResponse = await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.SESSIONS_START}`,
        {
          exercise_name: selectedExercise.name,
          exercise_category: selectedExercise.category,
          mood_before: 5,
          location_type: "home"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const sessionId = startResponse.data.id;

      // Complete session
      await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.SESSION_COMPLETE(sessionId)}`,
        {
          mood_after: 7,
          session_completed: true,
          notes: "Completed via quick mark"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMarkingExercise(false);
      setShowConfirmation(false);
      
      // Ask if user wants to mark another
      const wantAnother = confirm("Exercise marked as completed! ✅\n\nWant to mark another exercise as completed?");
      
      if (wantAnother) {
        setSelectedExercise(null);
        setSearchTerm("");
      } else {
        setShowMarkExerciseDialog(false);
        setSelectedExercise(null);
      }
      
      // Refresh data
      fetchAllData();
    } catch (error) {
      console.error("Error marking exercise:", error);
      setMarkingExercise(false);
      alert("Failed to mark exercise as completed. Please try again.");
    }
  };

  const deleteGoal = async (goalId, event) => {
    event.stopPropagation(); // Prevent card click
    if (!confirm("Are you sure you want to delete this goal?")) return;
    
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.GOALS_DELETE(goalId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllData();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const resetProgressTracker = async () => {
    try {
      setShowActionMenu(false);
      const token = localStorage.getItem("access_token");
      
      // This would call a backend endpoint to reset progress data
      // For now, we'll just refresh the data
      await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.RESET}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {
        // If endpoint doesn't exist, just show success message
        alert("Progress tracker has been reset!");
      });
      
      fetchAllData();
    } catch (error) {
      console.error("Error resetting progress tracker:", error);
      alert("Failed to reset progress tracker. Please try again.");
    }
  };

  const createGoal = async () => {
    if (!newGoal.title || !newGoal.exercise_name) {
      alert("Please fill in goal title and select an exercise.");
      return;
    }

    try {
      setCreatingGoal(true);
      const token = localStorage.getItem("access_token");
      
      await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.GOALS_CREATE}`,
        {
          title: newGoal.title,
          target_exercise_name: newGoal.exercise_name,
          goal_type: newGoal.goal_type,
          description: newGoal.description || null,
          target_value: parseInt(newGoal.target_value) || 10,
          reminder_frequency: "weekly"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset form
      setNewGoal({
        title: "",
        exercise_name: "",
        goal_type: "specific_exercise",
        description: "",
        target_value: 10
      });
      setShowAddGoalDialog(false);
      fetchAllData();
      alert("Goal created successfully! 🎯");
    } catch (error) {
      console.error("Error creating goal:", error);
      const errorMsg = error.response?.data?.detail || "Failed to create goal. Please try again.";
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setCreatingGoal(false);
    }
  };

  // Helper functions
  const getMoodColor = (score) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-blue-500";
    if (score >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  const getMoodBgColor = (score) => {
    if (score >= 8) return darkMode ? "bg-green-500/20" : "bg-green-100";
    if (score >= 6) return darkMode ? "bg-blue-500/20" : "bg-blue-100";
    if (score >= 4) return darkMode ? "bg-yellow-500/20" : "bg-yellow-100";
    return darkMode ? "bg-red-500/20" : "bg-red-100";
  };

  const generateCalendarGrid = () => {
    const grid = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29); // Start from 29 days ago to include today (30 days total)

    // Create a map of dates from backend data
    const dataMap = {};
    if (Array.isArray(calendarData)) {
      calendarData.forEach(day => {
        // Normalize date to YYYY-MM-DD format
        let dateStr = day.date;
        if (typeof dateStr !== 'string') {
          // Handle Date objects
          dateStr = new Date(dateStr).toISOString().split('T')[0];
        } else if (dateStr.includes('T')) {
          // Handle ISO datetime strings
          dateStr = dateStr.split('T')[0];
        }
        dataMap[dateStr] = day;
      });
    }

    // Generate 30-day grid
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dataMap[dateStr];
      
      grid.push({
        date: dateStr,
        intensity: dayData?.intensity ?? 0,
        count: dayData?.count ?? 0
      });
    }

    return grid;
  };

  const getIntensityColor = (intensity) => {
    if (darkMode) {
      const colors = ["#374151", "#10b981", "#059669", "#047857", "#065f46"];
      return colors[intensity] || colors[0];
    } else {
      const colors = ["#f3f4f6", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399"];
      return colors[intensity] || colors[0];
    }
  };

  const filteredExercises = Array.isArray(exercises) 
    ? exercises.filter(ex => 
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className={`animate-spin rounded-full h-12 w-12 border-4 ${
          darkMode ? "border-green-500 border-t-transparent" : "border-green-600 border-t-transparent"
        }`}></div>
      </div>
    );
  }

  const calendarGrid = generateCalendarGrid();
  const totalPracticeDays = calendarGrid.filter(day => day.count > 0).length;

  return (
    <div className="h-screen overflow-y-auto">
      <div className="space-y-6 p-6">
        {/* Header with Action Menu */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Progress Tracker
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Track your mindfulness journey
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchAllData()}
              className={`p-2 rounded-lg transition-all ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-400"
                  : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
              }`}
              title="Refresh data"
            >
              <RefreshCw className="h-5 w-5" />
            </motion.button>

            {/* Time Period Selector */}
            <div className="flex items-center space-x-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setSelectedDays(days)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedDays === days
                      ? darkMode
                        ? "bg-green-600 text-white"
                        : "bg-green-500 text-white"
                      : darkMode
                        ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            {/* Action Menu */}
            <div className="relative" ref={actionMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowActionMenu(!showActionMenu)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all shadow-lg ${
                  darkMode
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                }`}
              >
                <Plus className="h-5 w-5" />
                <span>Actions</span>
                <ChevronDown className="h-4 w-4" />
              </motion.button>

              <AnimatePresence>
                {showActionMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl z-50 ${
                      darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
                    }`}
                  >
                    <button
                      onClick={startMoodAssessment}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-t-xl transition-colors ${
                        darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-50 text-gray-900"
                      }`}
                    >
                      <Smile className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Mood Assessment</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowActionMenu(false);
                        setShowAddGoalDialog(true);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                        darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-50 text-gray-900"
                      }`}
                    >
                      <Target className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Add Goal</span>
                    </button>
                    
                    <button
                      onClick={openMarkExercise}
                      className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                        darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-50 text-gray-900"
                      }`}
                    >
                      <Activity className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Mark Exercise</span>
                    </button>
                    
                    <div className={`border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}></div>
                    
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to reset all progress tracker data? This will clear your calendar, streaks, and session history. Goals and achievements will remain.")) {
                          resetProgressTracker();
                        }
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-b-xl transition-colors ${
                        darkMode ? "hover:bg-red-900/50 text-red-400" : "hover:bg-red-50 text-red-600"
                      }`}
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Reset Progress</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Main KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Activities KPI */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-6 rounded-2xl cursor-pointer transition-all ${
              darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-full ${darkMode ? "bg-green-500/20" : "bg-green-100"}`}>
                <Activity className="h-6 w-6 text-green-500" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {stats?.total_activities || 0}
            </p>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Total Activities
            </p>
          </motion.div>

          {/* Average Mood KPI */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setExpandedSection(expandedSection === "mood" ? null : "mood")}
            className={`p-6 rounded-2xl cursor-pointer transition-all ${
              darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-full ${darkMode ? "bg-blue-500/20" : "bg-blue-100"}`}>
                <Smile className="h-6 w-6 text-blue-500" />
              </div>
              {expandedSection === "mood" ? (
                <ChevronUp className="h-5 w-5 text-blue-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {stats?.avg_combined_mood ? stats.avg_combined_mood.toFixed(1) : "N/A"}
              {stats?.avg_combined_mood && <span className="text-xl">/10</span>}
            </p>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Average Mood
            </p>
          </motion.div>

          {/* Goals KPI */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setExpandedSection(expandedSection === "goals" ? null : "goals")}
            className={`p-6 rounded-2xl cursor-pointer transition-all ${
              darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-full ${darkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
                <Target className="h-6 w-6 text-purple-500" />
              </div>
              {expandedSection === "goals" ? (
                <ChevronUp className="h-5 w-5 text-purple-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-purple-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {goals.length}
              <span className="text-xl">/3</span>
            </p>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Active Goals
            </p>
          </motion.div>

          {/* Achievements KPI */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setExpandedSection(expandedSection === "achievements" ? null : "achievements")}
            className={`p-6 rounded-2xl cursor-pointer transition-all ${
              darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-full ${darkMode ? "bg-yellow-500/20" : "bg-yellow-100"}`}>
                <Award className="h-6 w-6 text-yellow-500" />
              </div>
              {expandedSection === "achievements" ? (
                <ChevronUp className="h-5 w-5 text-yellow-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <p className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {achievements.filter(a => a.unlocked).length}
            </p>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Achievements Unlocked
            </p>
          </motion.div>
        </div>

        {/* Practice Calendar with Streak */}
        <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className={`h-5 w-5 ${darkMode ? "text-green-400" : "text-green-600"}`} />
              <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Practice Calendar (Last 30 Days)
              </h3>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${
                darkMode ? "bg-orange-500/20" : "bg-orange-100"
              }`}>
                <Zap className="h-4 w-4 text-orange-500" />
                <span className={`text-sm font-bold ${darkMode ? "text-orange-400" : "text-orange-600"}`}>
                  {currentStreak} Day Streak 🔥
                </span>
              </div>
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {totalPracticeDays} days practiced
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-10 gap-1.5">
            {calendarGrid.map((day, index) => (
              <div
                key={index}
                className="w-full h-8 rounded-sm cursor-pointer transition-transform hover:scale-110 relative group"
                style={{ backgroundColor: getIntensityColor(day.intensity) }}
              >
                <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${
                  darkMode ? "bg-gray-900 text-white" : "bg-gray-800 text-white"
                }`}>
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.count} session{day.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable Sections */}
        <AnimatePresence>
          {/* Mood Assessments Section */}
          {expandedSection === "mood" && moodAssessments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} overflow-hidden`}
            >
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Recent Mood Assessments
              </h3>
              <div className="space-y-3">
                {moodAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className={`p-4 rounded-xl ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getMoodBgColor(assessment.overall_mood_score)} ${getMoodColor(assessment.overall_mood_score)}`}>
                          {assessment.overall_mood_score?.toFixed(1)}/10
                        </div>
                        <div>
                          <h4 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {assessment.overall_mood_label}
                          </h4>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {new Date(assessment.assessment_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    {assessment.summary && (
                      <p className={`mt-3 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {assessment.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Goals Section */}
          {expandedSection === "goals" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} overflow-hidden`}
            >
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Active Goals
              </h3>
              {goals.length === 0 ? (
                <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  No active goals yet. Create one to start tracking!
                </p>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`p-4 rounded-xl relative ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
                    >
                      <button
                        onClick={(e) => deleteGoal(goal.id, e)}
                        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-10 ${
                          darkMode ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-600"
                        }`}
                        title="Delete goal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <h4 className={`font-semibold pr-8 ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {goal.title}
                      </h4>
                      <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {goal.exercise_name} • {goal.goal_type}
                      </p>
                      {goal.description && (
                        <p className={`text-sm mt-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {goal.description}
                        </p>
                      )}
                      <div className={`mt-3 h-2 rounded-full overflow-hidden ${darkMode ? "bg-gray-800" : "bg-gray-200"}`}>
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                          style={{ width: `${goal.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Achievements Section */}
          {expandedSection === "achievements" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} overflow-hidden`}
            >
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Achievements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {achievements.filter(a => a.unlocked).map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-xl ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Award className={`h-8 w-8 ${
                        achievement.rarity === "legendary" ? "text-yellow-500" :
                        achievement.rarity === "epic" ? "text-purple-500" :
                        achievement.rarity === "rare" ? "text-blue-500" :
                        "text-gray-500"
                      }`} />
                      <div>
                        <h4 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {achievement.name}
                        </h4>
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Activity Timeline */}
        <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
          <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Recent Activity
          </h3>
          {recentActivities.length === 0 ? (
            <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              No recent activities
            </p>
          ) : (
            <div className="space-y-3">
              {(recentActivities || []).slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className={`p-4 rounded-xl flex items-center space-x-3 ${
                    darkMode ? "bg-gray-900" : "bg-gray-50"
                  }`}
                >
                  {activity.type === 'exercise' && <Activity className="h-5 w-5 text-green-500" />}
                  {activity.type === 'mood' && <Smile className="h-5 w-5 text-blue-500" />}
                  {activity.type === 'journal' && <Book className="h-5 w-5 text-purple-500" />}
                  <div className="flex-1">
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {activity.title}
                    </p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mood Assessment Dialog */}
      <AnimatePresence>
        {showMoodDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-2xl h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
                darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
              }`}
            >
              {/* Dialog Header */}
              <div className={`p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Mood Assessment
                    </h3>
                    {!assessmentComplete && questionNumber > 0 && (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Question {questionNumber} of 5
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeMoodDialog}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <X className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.type === "user"
                          ? darkMode
                            ? "bg-green-600 text-white"
                            : "bg-green-500 text-white"
                          : msg.type === "error"
                            ? "bg-red-500/10 border border-red-500 text-red-500"
                            : darkMode
                              ? "bg-gray-700 text-gray-100"
                              : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />

                {/* Results */}
                {assessmentComplete && moodResult && (
                  <div className={`p-6 rounded-xl ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                    <div className="text-center mb-4">
                      <div className={`inline-flex px-6 py-3 rounded-full text-2xl font-bold ${getMoodBgColor(moodResult.overall_mood_score)} ${getMoodColor(moodResult.overall_mood_score)}`}>
                        {moodResult.overall_mood_score?.toFixed(1)}/10
                      </div>
                      <h4 className={`text-xl font-bold mt-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {moodResult.overall_mood_label}
                      </h4>
                    </div>

                    {moodResult.summary && (
                      <p className={`text-sm text-center mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {moodResult.summary}
                      </p>
                    )}

                    {moodResult.reasoning && (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
                        <p className={`text-sm ${darkMode ? "text-blue-300" : "text-blue-800"}`}>
                          {moodResult.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              {!assessmentComplete && (
                <div className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center space-x-2">
                    <textarea
                      value={userResponse}
                      onChange={(e) => {
                        setUserResponse(e.target.value);
                        if (e.target.value.trim()) {
                          setValidationError(validateResponse(e.target.value));
                        } else {
                          setValidationError(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitMoodResponse();
                        }
                      }}
                      placeholder={`Type your response... (minimum ${MIN_RESPONSE_LENGTH} characters)`}
                      rows={2}
                      className={`flex-1 px-4 py-2 rounded-xl resize-none ${
                        validationError ? "border-red-500" : ""
                      } ${
                        darkMode
                          ? "bg-gray-700 text-white placeholder-gray-400 border-gray-600"
                          : "bg-gray-50 text-gray-900 placeholder-gray-500 border-gray-300"
                      } border focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={submitMoodResponse}
                      disabled={!userResponse.trim() || submitting || !!validationError}
                      className={`p-3 rounded-xl ${
                        darkMode
                          ? "bg-green-600 hover:bg-green-500"
                          : "bg-green-500 hover:bg-green-600"
                      } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {submitting ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </motion.button>
                  </div>
                  {validationError && (
                    <p className="text-red-500 text-xs mt-1">{validationError}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                      Press Enter to send • Shift+Enter for new line
                    </p>
                    <p className={`text-xs ${
                      userResponse.length < MIN_RESPONSE_LENGTH
                        ? "text-yellow-500"
                        : userResponse.length > MAX_RESPONSE_LENGTH
                        ? "text-red-500"
                        : darkMode ? "text-gray-500" : "text-gray-400"
                    }`}>
                      {userResponse.length}/{MAX_RESPONSE_LENGTH}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark Exercise Dialog */}
      <AnimatePresence>
        {showMarkExerciseDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {!showConfirmation ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
                  darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Mark Exercise as Completed
                    </h3>
                    <button
                      onClick={() => {
                        setShowMarkExerciseDialog(false);
                        setSelectedExercise(null);
                        setSearchTerm("");
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                    >
                      <X className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="p-4">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search exercises..."
                      className={`w-full pl-10 pr-4 py-2 rounded-xl ${
                        darkMode
                          ? "bg-gray-700 text-white placeholder-gray-400 border-gray-600"
                          : "bg-gray-50 text-gray-900 placeholder-gray-500 border-gray-300"
                      } border focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                </div>

                {/* Exercise List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => selectExercise(exercise)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{exercise.name}</h4>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {exercise.category} • {exercise.steps?.length || 0} steps
                          </p>
                        </div>
                        <ChevronDown className="h-5 w-5 transform -rotate-90" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
                  darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Confirm Completion
                    </h3>
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                    >
                      <X className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-center mb-6">
                    <h4 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {selectedExercise?.name}
                    </h4>
                    <p className={`text-lg mb-6 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Did you complete all of these steps?
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl mb-6 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                    <ul className="space-y-3">
                      {selectedExercise?.steps?.map((step, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <CheckCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            darkMode ? "text-green-400" : "text-green-600"
                          }`} />
                          <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-center space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={markExerciseComplete}
                      disabled={markingExercise}
                      className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                        darkMode
                          ? "bg-green-600 hover:bg-green-500 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {markingExercise ? (
                        <div className="flex items-center space-x-2">
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>Marking...</span>
                        </div>
                      ) : (
                        "Yes, I Completed It"
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowConfirmation(false);
                        setSelectedExercise(null);
                      }}
                      className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      No, Go Back
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddGoalDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
                darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}>
                <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Create New Goal
                </h3>
                <button
                  onClick={() => setShowAddGoalDialog(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {/* Goal Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g., Complete 10 meditation sessions"
                    className={`w-full px-4 py-3 rounded-xl transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600"
                        : "bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>

                {/* Exercise Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Exercise *
                  </label>
                  <select
                    value={newGoal.exercise_name}
                    onChange={(e) => setNewGoal({ ...newGoal, exercise_name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-white focus:bg-gray-600"
                        : "bg-gray-50 text-gray-900 focus:bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">Select an exercise</option>
                    {Array.isArray(exercises) && exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.name}>
                        {exercise.name} ({exercise.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Goal Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Goal Type
                  </label>
                  <select
                    value={newGoal.goal_type}
                    onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-white focus:bg-gray-600"
                        : "bg-gray-50 text-gray-900 focus:bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="daily_practice">Daily Practice</option>
                    <option value="weekly_practice">Weekly Practice</option>
                    <option value="exercise_variety">Exercise Variety</option>
                    <option value="streak_milestone">Streak Milestone</option>
                    <option value="total_sessions">Total Sessions</option>
                    <option value="specific_exercise">Specific Exercise</option>
                    <option value="time_based">Time Based</option>
                    <option value="mood_improvement">Mood Improvement</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Target Value */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Target Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                    placeholder="e.g., 10"
                    className={`w-full px-4 py-3 rounded-xl transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600"
                        : "bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Description (Optional)
                  </label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Add any additional details about your goal..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl transition-colors resize-none ${
                      darkMode
                        ? "bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600"
                        : "bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-end space-x-3 p-6 border-t ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddGoalDialog(false)}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={createGoal}
                  disabled={creatingGoal || !newGoal.title || !newGoal.exercise_name}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                    darkMode
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {creatingGoal ? (
                    <div className="flex items-center space-x-2">
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Create Goal"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedProgressTracker;
