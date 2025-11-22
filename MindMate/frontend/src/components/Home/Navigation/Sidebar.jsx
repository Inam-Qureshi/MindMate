import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Star,
  Search,
  BookOpen,
  Heart,
  Activity,
  Eye,
  TrendingUp,
  Bookmark,
  AlertCircle,
  Calendar,
  Clock,
  BarChart,
  BarChart2,
  Smile,
  ArrowRight,
  ChevronLeft,
  Loader,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Users,
  UserCheck,
  Home
} from "react-feather";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { DeleteConfirmationDialog, useConfirmationDialog } from "../../ConfirmationDialog";
import LoadingSkeleton from "../../LoadingSkeleton";
import { AccessibleButton, ScreenReaderText, useReducedMotion } from "../../Accessibility";
import ProfileDropdown from "./ProfileDropdown";
import { API_URL } from "../../../config/api";
import { ROUTES } from "../../../config/routes";

// Navigation tabs configuration - New 4-page structure
// Use route constants for consistency
const tabs = [
  { 
    id: "dashboard", 
    icon: <Home size={20} />, 
    label: "Dashboard", 
    description: "Your wellness overview",
    path: ROUTES.DASHBOARD
  },
  { 
    id: "assessment", 
    icon: <MessageSquare size={20} />, 
    label: "Mental Health Assessment", 
    description: "Take a comprehensive assessment",
    path: ROUTES.ASSESSMENT
  },
  { 
    id: "specialists", 
    icon: <UserCheck size={20} />, 
    label: "Find a Specialist", 
    description: "Connect with mental health professionals",
    path: ROUTES.DASHBOARD + "/specialists"
  },
  { 
    id: "forum", 
    icon: <Users size={20} />, 
    label: "Community Forum", 
    description: "Connect with the community",
    path: ROUTES.FORUM
  },
  { 
    id: "exercises", 
    icon: <Activity size={20} />, 
    label: "Wellness Exercises", 
    description: "Mental health exercises and journaling",
    path: ROUTES.DASHBOARD + "/exercises"
  }
];

const Sidebar = ({
  darkMode,
  setDarkMode,
  onHoverChange,
  activeChatId,
  setActiveChatId,
  refreshSessions,
  activeTab,
  activeSidebarItem,
  onSidebarItemClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [chatSessions, setChatSessions] = useState({
    pinned_sessions: [],
    other_sessions: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingSessions, setTogglingSessions] = useState(new Set());
  const [focusedItem, setFocusedItem] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const sidebarRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Confirmation dialog for deleting chats
  const deleteDialog = useConfirmationDialog();

  // Navigation handler
  const handleTabClick = (tabId) => {
    // Use route constants for consistent navigation
    const tabRouteMap = {
      'dashboard': ROUTES.DASHBOARD,
      'assessment': ROUTES.ASSESSMENT,
      'specialists': `${ROUTES.DASHBOARD}/specialists`,
      'forum': ROUTES.FORUM,
      'exercises': `${ROUTES.DASHBOARD}/exercises`
    };
    const route = tabRouteMap[tabId] || `${ROUTES.DASHBOARD}/${tabId}`;
    navigate(route);
  };

  // Navigation handler for appointments
  const navigateToAppointments = () => {
    navigate(ROUTES.APPOINTMENTS);
  };

  // Get sidebar content based on active tab
  const getSidebarContent = () => {
    switch (activeTab) {
      case "chat":
        return [
          { id: "new-chat", icon: <Plus size={18} />, label: "New Chat", action: createNewChat, active: activeSidebarItem === "new-chat" },
          { id: "pinned", icon: <Star size={18} />, label: "Pinned Chats", action: null, active: activeSidebarItem === "pinned" },
          { id: "recent", icon: <MessageSquare size={18} />, label: "Recent Chats", action: null, active: activeSidebarItem === "recent" },
        ];
      case "journal":
        return [
          { id: "new-entry", icon: <Plus size={18} />, label: "New Entry", action: null, active: activeSidebarItem === "new-entry" },
          { id: "today", icon: <BookOpen size={18} />, label: "Today's Entries", action: null, active: activeSidebarItem === "today" },
          { id: "mood-tracker", icon: <Heart size={18} />, label: "Mood Tracker", action: null, active: activeSidebarItem === "mood-tracker" },
          { id: "insights", icon: <BarChart size={18} />, label: "Insights", action: null, active: activeSidebarItem === "insights" },
        ];
      case "exercises":
        return [
          { id: "all-exercises", icon: <Activity size={18} />, label: "All Exercises", action: null, active: activeSidebarItem === "all-exercises" || !activeSidebarItem },
          { id: "journal", icon: <BookOpen size={18} />, label: "Exercise Journal", action: null, active: activeSidebarItem === "journal" },
          { id: "favorites", icon: <Star size={18} />, label: "Saved Exercises", action: null, active: activeSidebarItem === "favorites" },
          { id: "progress", icon: <TrendingUp size={18} />, label: "Progress Tracker", action: null, active: activeSidebarItem === "progress" },
        ];
      case "forum":
        return [
          { id: "questions", icon: <MessageSquare size={18} />, label: "My Questions", action: null, active: activeSidebarItem === "questions" },
          { id: "bookmarks", icon: <Bookmark size={18} />, label: "Bookmarks", action: null, active: activeSidebarItem === "bookmarks" },
          { id: "moderation", icon: <AlertCircle size={18} />, label: "Moderation", action: null, active: activeSidebarItem === "moderation" }
        ];
      case "specialists":
        return [
          { id: "appointments", icon: <Calendar size={18} />, label: "My Appointments", action: navigateToAppointments, active: activeSidebarItem === "appointments" },
          { id: "history", icon: <Clock size={18} />, label: "Session History", action: null, active: activeSidebarItem === "history" },
        ];
      case "appointments":
        return [
          { id: "all", icon: <Calendar size={18} />, label: "All Appointments", action: null, active: activeSidebarItem === "all" || !activeSidebarItem },
          { id: "pending", icon: <AlertTriangle size={18} />, label: "Pending Approval", action: null, active: activeSidebarItem === "pending" },
          { id: "confirmed", icon: <CheckCircle size={18} />, label: "Confirmed", action: null, active: activeSidebarItem === "confirmed" },
          { id: "completed", icon: <Clock size={18} />, label: "Completed", action: null, active: activeSidebarItem === "completed" },
        ];
      case "favorites":
        return [
          { id: "manage", icon: <Heart size={18} />, label: "Manage Favorites", action: null, active: activeSidebarItem === "manage" },
          { id: "recent", icon: <Clock size={18} />, label: "Recently Added", action: null, active: activeSidebarItem === "recent" },
        ];
      case "progress-tracker":
        return [
          { id: "overview", icon: <BarChart2 size={18} />, label: "Overview", action: null, active: activeSidebarItem === "overview" || !activeSidebarItem },
          { id: "sessions", icon: <Smile size={18} />, label: "Mood Assessment", action: null, active: activeSidebarItem === "sessions" },
          { id: "goals", icon: <TrendingUp size={18} />, label: "Goals", action: null, active: activeSidebarItem === "goals" },
          { id: "achievements", icon: <Star size={18} />, label: "Achievements", action: null, active: activeSidebarItem === "achievements" },
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    const fetchChatSessions = async () => {
      try {
        setLoading(true);
        // Session management is now handled by the assessment system
        // For now, we'll use a simplified approach
        const chatSessionsData = {
          pinned_sessions: [],
          other_sessions: []
        };

        setChatSessions(chatSessionsData);

        // Set first session as active if none is selected
        const allSessions = [
          ...chatSessionsData.pinned_sessions,
          ...chatSessionsData.other_sessions,
        ];

        if (allSessions.length > 0 && !activeChatId && setActiveChatId) {
          setActiveChatId(allSessions[0].id);
        }
    } catch (err) {
      console.error("Error fetching chat sessions:", err);
      
      // Handle different error types
      if (err.code === 'ECONNABORTED' || err.message === 'Request aborted') {
        setError("Request timed out. Please try again.");
      } else if (err.response?.status === 401) {
        setError("Please log in again to view chat sessions.");
      } else {
        setError("Failed to load chat sessions");
      }
    } finally {
      setLoading(false);
    }
    };

    fetchChatSessions();
  }, [activeChatId, refreshSessions]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const createNewChat = async () => {
    try {
      // Session creation is now handled by the assessment system
      // Generate a simple session ID for the frontend
      const newSession = {
        id: `session-${Date.now()}`,
        title: "New Assessment",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_pinned: false,
        message_count: 0,
        session_type: "assessment"
      };
      setChatSessions((prev) => ({
        ...prev,
        other_sessions: [newSession, ...prev.other_sessions],
      }));
      if (setActiveChatId) {
        setActiveChatId(newSession.id);
      }
    } catch (err) {
      console.error("Error creating new chat session:", err);
      
      // Handle different error types
      if (err.code === 'ECONNABORTED' || err.message === 'Request aborted') {
        setError("Request timed out. Please try again.");
      } else if (err.response?.status === 401) {
        setError("Please log in again to create a new chat.");
      } else {
        setError("Failed to create new chat");
      }
    }
  };

  const deleteChatSession = useCallback(async (sessionId) => {
    try {
      // Session deletion is now handled by the assessment system
      // Just remove from local state
      setChatSessions((prev) => ({
        pinned_sessions: prev.pinned_sessions.filter((s) => s.id !== sessionId),
        other_sessions: prev.other_sessions.filter((s) => s.id !== sessionId),
      }));

      // Handle active session if deleted
      if (activeChatId === sessionId) {
        const remainingSessions = [
          ...chatSessions.pinned_sessions,
          ...chatSessions.other_sessions,
        ].filter((s) => s.id !== sessionId);

        if (setActiveChatId) {
          setActiveChatId(remainingSessions[0]?.id || null);
        }
      }
    } catch (err) {
      console.error("Error deleting chat session:", err);
      setError("Failed to delete chat");
    }
  }, [activeChatId, chatSessions, setActiveChatId]);

  const togglePinSession = async (sessionId, e) => {
    e.stopPropagation();
    
    // Prevent multiple simultaneous toggles
    if (togglingSessions.has(sessionId)) return;
    
    setTogglingSessions(prev => new Set(prev).add(sessionId));
    setError(null);
    
    // Store original state for rollback
    const originalState = {
      pinned_sessions: [...chatSessions.pinned_sessions],
      other_sessions: [...chatSessions.other_sessions]
    };
    
    try {
      // Pin/unpin is now handled locally since assessment system manages sessions
      setChatSessions((prev) => {
        const updateSessionInList = (sessions) => 
          sessions.map((s) => s.id === sessionId ? { ...s, is_pinned: !s.is_pinned } : s);
        
        return {
          pinned_sessions: updateSessionInList(prev.pinned_sessions),
          other_sessions: updateSessionInList(prev.other_sessions),
        };
      });
      
    } catch (err) {
      console.error("Error toggling pin:", err);
      
      // Rollback UI state
      setChatSessions(originalState);
      
      // Handle specific error types
      if (err.response?.data?.error) {
        const errorData = err.response.data;
        switch (errorData.error) {
          case 'SESSION_NOT_FOUND':
            setError("Session not found. It may have been deleted.");
            break;
          case 'ACCESS_DENIED':
            setError("You don't have permission to modify this session.");
            break;
          case 'DATABASE_ERROR':
            setError("Failed to save changes. Please try again.");
            break;
          default:
            setError("Failed to toggle pin status. Please try again.");
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setTogglingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  // Toggle sidebar expansion
  const toggleSidebar = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onHoverChange?.(newExpandedState);
  };

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((e) => {
    if (!isExpanded) return;

    const items = getSidebarContent();
    const currentIndex = items.findIndex(item => item.active);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, items.length - 1);
        if (items[nextIndex]) {
          onSidebarItemClick?.(items[nextIndex].id);
          setFocusedItem(items[nextIndex].id);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (items[prevIndex]) {
          onSidebarItemClick?.(items[prevIndex].id);
          setFocusedItem(items[prevIndex].id);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        const currentItem = items[currentIndex];
        if (currentItem?.action) {
          currentItem.action();
        } else if (onSidebarItemClick) {
          onSidebarItemClick(currentItem?.id);
        }
        break;
    }
  }, [isExpanded, activeSidebarItem, onSidebarItemClick, getSidebarContent]);

  const groupSessionsByDate = (sessions) => {
    const groups = {};
    sessions.forEach((session) => {
      const date = parseISO(session.updated_at);
      let groupName;
      if (isToday(date)) groupName = "Today";
      else if (isYesterday(date)) groupName = "Yesterday";
      else groupName = format(date, "MMMM yyyy");
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(session);
    });
    return groups;
  };

  const filterSessions = (sessions) => {
    return sessions.filter((session) =>
      session.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredPinned = filterSessions(chatSessions.pinned_sessions);
  const filteredOther = filterSessions(chatSessions.other_sessions);
  const groupedOtherSessions = groupSessionsByDate(filteredOther);

  if (loading) {
    return (
      <div
        className={`h-full ${
          darkMode ? "bg-gray-800" : "bg-white"
        } border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <LoadingSkeleton variant="forum" count={3} className="p-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center p-4 ${
          darkMode ? "bg-gray-800 text-red-400" : "bg-white text-red-600"
        }`}
      >
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">Error</p>
        </div>
        <p className="text-sm text-center mb-4">{error}</p>
        <button
          onClick={() => setError(null)}
          className={`px-3 py-1 rounded-md text-xs transition-colors ${
            darkMode
              ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <header
        className={`sticky top-0 z-50 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-md py-4 px-6 flex justify-between items-center border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
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
            className={`p-2 rounded-full ${
              darkMode
                ? "bg-gray-700 text-yellow-300"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ProfileDropdown darkMode={darkMode} />
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={`px-6 py-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? darkMode
                    ? "bg-gray-700 text-white shadow-md"
                    : "bg-gray-200 text-gray-900 shadow-md"
                  : darkMode
                  ? "text-gray-400 hover:bg-gray-700 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <div className="flex-shrink-0 mr-3">
                {tab.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{tab.label}</div>
                <div className={`text-xs ${
                  activeTab === tab.id
                    ? darkMode ? "text-gray-300" : "text-gray-600"
                    : darkMode ? "text-gray-500" : "text-gray-500"
                }`}>
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <motion.aside
        ref={sidebarRef}
        initial={{ width: prefersReducedMotion ? (isExpanded ? 256 : 64) : "240px" }}
        animate={{
          width: prefersReducedMotion ? (isExpanded ? 256 : 64) : (isExpanded ? 240 : 72)
        }}
        transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 160, damping: 20 }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="navigation"
        aria-label={`${activeTab} navigation`}
      className={`h-full flex flex-col relative ${
        darkMode ? "bg-gray-800" : "bg-white"
      } border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`absolute top-4 ${isExpanded ? 'right-4' : 'right-1/2 transform translate-x-1/2'} z-10 p-2 rounded-md transition-all ${
          darkMode
            ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isExpanded ? <ChevronLeft size={18} /> : <ArrowRight size={18} />}
      </button>

      {/* Dynamic Sidebar Content */}
      {activeTab === "chat" ? (
        <>
          {/* New Chat Button */}
          <div className="p-4 pt-16 border-b border-gray-700">
            <button
              onClick={createNewChat}
              className={`flex items-center justify-center w-full p-2 rounded-md ${
                darkMode
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-700"
              } transition-colors`}
              aria-label="New chat"
            >
              <Plus size={18} className="flex-shrink-0" />
              {isExpanded && <span className="ml-2 whitespace-nowrap">New Chat</span>}
            </button>
          </div>

          {/* Search Bar */}
          {isExpanded && (
            <div className="px-3 py-2">
              <div
                className={`relative rounded-md ${
                  darkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <Search
                  size={14}
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-2 pl-9 pr-3 bg-transparent focus:outline-none ${
                    darkMode
                      ? "text-white placeholder-gray-400"
                      : "text-gray-800 placeholder-gray-500"
                  }`}
                  aria-label="Search chats"
                />
              </div>
            </div>
          )}
        </>
      ) : (
        /* Show tab-specific sidebar options */
        <div className="p-4 pt-16">
          <div className={`text-sm font-medium mb-3 ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            {isExpanded && (activeTab ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : "Options")}
          </div>
          {getSidebarContent().map((item) => (
            <div
              key={item.id}
              className={`mb-2 flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                item.active
                  ? darkMode
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-900"
                  : darkMode
                  ? "text-gray-400 hover:bg-gray-700 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (onSidebarItemClick) {
                  onSidebarItemClick(item.id);
                }
              }}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-3 text-sm font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat History - Only show when in chat tab */}
      {activeTab === "chat" && (
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredPinned.length > 0 && isExpanded && (
            <div className="px-3 py-1">
              <h3
                className={`text-xs font-medium ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                } uppercase tracking-wider`}
              >
                Pinned
              </h3>
            </div>
          )}

          {filteredPinned.length > 0 && (
            <div className="mb-4">
              {filteredPinned.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isExpanded={isExpanded}
                  darkMode={darkMode}
                  isActive={activeChatId === session.id}
                  onClick={() => setActiveChatId && setActiveChatId(session.id)}
                  onDelete={() => deleteDialog.openDialog(() => deleteChatSession(session.id))}
                  onTogglePin={(e) => togglePinSession(session.id, e)}
                  isPinned={true}
                  isToggling={togglingSessions.has(session.id)}
                />
              ))}
            </div>
          )}

          {Object.entries(groupedOtherSessions).map(([groupName, sessions]) => (
            <div key={groupName}>
              {isExpanded && (
                <div className="px-3 py-1">
                  <h3
                    className={`text-xs font-medium ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    } uppercase tracking-wider`}
                  >
                    {groupName}
                  </h3>
                </div>
              )}
              {sessions.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isExpanded={isExpanded}
                  darkMode={darkMode}
                  isActive={activeChatId === session.id}
                  onClick={() => setActiveChatId && setActiveChatId(session.id)}
                  onDelete={() => deleteDialog.openDialog(() => deleteChatSession(session.id))}
                  onTogglePin={(e) => togglePinSession(session.id, e)}
                  isPinned={false}
                  isToggling={togglingSessions.has(session.id)}
                />
              ))}
            </div>
          ))}

          {filteredPinned.length === 0 && filteredOther.length === 0 && (
            <div
              className={`p-4 text-center ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {searchQuery ? "No matching chats" : "No chat sessions yet"}
            </div>
          )}
        </nav>
      )}
      </motion.aside>

      {/* Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        itemName="this chat session"
        itemType="chat"
        onConfirm={deleteDialog.confirmAction}
        onCancel={deleteDialog.closeDialog}
        isLoading={false}
      />
    </>
  );
};

const ChatSessionItem = ({
  session,
  isExpanded,
  darkMode,
  isActive,
  onClick,
  onDelete,
  onTogglePin,
  isPinned,
  isToggling = false,
}) => {
  return (
    <motion.div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 mx-2 my-1 rounded-md cursor-pointer ${
        isActive
          ? darkMode
            ? "bg-gray-700 shadow-inner"
            : "bg-gray-200 shadow-inner"
          : darkMode
          ? "hover:bg-gray-700"
          : "hover:bg-gray-100"
      } transition-all duration-200`}
      aria-current={isActive ? "true" : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center truncate min-w-0">
        <MessageSquare size={16} className="flex-shrink-0" />
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-2 truncate"
            >
              {session.title || "New Chat"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-1"
          >
            <AccessibleButton
              onClick={onTogglePin}
              disabled={isToggling}
              className={`p-1 rounded-md transition-colors ${
                isToggling
                  ? "opacity-50 cursor-not-allowed"
                  : isPinned
                  ? darkMode
                    ? "text-yellow-400 hover:bg-gray-600"
                    : "text-yellow-500 hover:bg-gray-300"
                  : darkMode
                  ? "text-gray-500 hover:bg-gray-600 hover:text-gray-300"
                  : "text-gray-400 hover:bg-gray-300 hover:text-gray-700"
              }`}
              ariaLabel={isToggling ? "Updating..." : (isPinned ? "Unpin chat" : "Pin chat")}
            >
              {isToggling ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Star size={14} fill={isPinned ? "currentColor" : "none"} />
              )}
            </AccessibleButton>
            <AccessibleButton
              onClick={onDelete}
              className={`p-1 rounded-md transition-colors ${
                darkMode
                  ? "hover:bg-red-600 text-gray-400 hover:text-white"
                  : "hover:bg-red-100 text-gray-500 hover:text-red-600"
              }`}
              ariaLabel="Delete chat"
            >
              <Trash2 size={14} />
            </AccessibleButton>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Sidebar;
