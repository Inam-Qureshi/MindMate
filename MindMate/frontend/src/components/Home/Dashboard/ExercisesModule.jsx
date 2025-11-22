import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Activity, 
  Search, 
  X, 
  ArrowRight, 
  Clock, 
  Star,
  Filter,
  BookOpen,
  Heart,
  Save,
  Trash2,
  Calendar,
  ChevronLeft
} from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const ExercisesModule = ({ darkMode, activeSidebarItem = "all-exercises" }) => {
  // Exercise state
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [personalizedExercises, setPersonalizedExercises] = useState([]);
  const [showJournalSidebar, setShowJournalSidebar] = useState(activeSidebarItem === "journal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  
  // Journal state
  const [journalEntries, setJournalEntries] = useState([]);
  const [newJournalEntry, setNewJournalEntry] = useState("");
  const [journalMood, setJournalMood] = useState("");
  const [journalTags, setJournalTags] = useState("");
  const [journalLoading, setJournalLoading] = useState(false);
  const [showArchivedJournal, setShowArchivedJournal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9); // 3x3 grid

  // Load exercises from backend API
  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading exercises from backend API...");
        
        // Fetch from backend API endpoint
        const response = await fetch(`${API_URL}${API_ENDPOINTS.EXERCISES.LIST}`);
        
        console.log("Response status:", response.status);
        console.log("Response URL:", response.url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log("Parsed data:", data);
        
        if (!data || !data.exercises) {
          throw new Error('Invalid exercise data structure - missing exercises array');
        }
        
        if (!Array.isArray(data.exercises)) {
          throw new Error('exercises property is not an array');
        }
        
        console.log(`✅ Successfully loaded ${data.exercises.length} exercises`);
        
        setExercises(data.exercises);
        
        // Set personalized exercises (first 3 for now - can be based on user data later)
        setPersonalizedExercises(data.exercises.slice(0, 3));
        
        setLoading(false);
      } catch (error) {
        console.error("❌ Error loading exercises:", error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    loadExercises();
  }, []);

  // Handle sidebar item changes
  useEffect(() => {
    setShowJournalSidebar(activeSidebarItem === "journal");
    if (activeSidebarItem === "journal") {
      fetchJournalEntries();
    }
  }, [activeSidebarItem]);

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.JOURNAL.ENTRIES}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { archived: showArchivedJournal }
      });
      setJournalEntries(response.data);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
    }
  }, [showArchivedJournal]);

  // Save journal entry
  const handleSaveJournalEntry = async () => {
    if (newJournalEntry.trim() === "") return;

    setJournalLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.JOURNAL.ENTRIES}`,
        {
          content: newJournalEntry,
          mood: journalMood || null,
          tags: journalTags || null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setJournalEntries([response.data, ...journalEntries]);
      setNewJournalEntry("");
      setJournalMood("");
      setJournalTags("");
    } catch (error) {
      console.error("Error saving journal entry:", error);
    } finally {
      setJournalLoading(false);
    }
  };

  // Delete journal entry
  const handleDeleteJournalEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}${API_ENDPOINTS.JOURNAL.ENTRY_DELETE(entryId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJournalEntries(journalEntries.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error("Error deleting journal entry:", error);
    }
  };

  // Filter exercises
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredExercises.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExercises = filteredExercises.slice(startIndex, endIndex);

  // Scroll to top when page changes
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    scrollToTop();
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      scrollToTop();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      scrollToTop();
    }
  };


  const handleQuickComplete = async (exercise) => {
    const confirmed = window.confirm(
      `Mark "${exercise.name}" as completed? Please confirm you have finished all the steps.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.SESSION_QUICK_COMPLETE}`,
        {
          exercise_name: exercise.name,
          exercise_category: exercise.category || exercise.type || "General",
          notes: `Quick completion recorded for ${exercise.name}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Exercise marked as completed! Progress tracker updated.");
      setSelectedExercise(null);
    } catch (error) {
      console.error("Error quick completing exercise:", error);
      alert("Failed to mark exercise as completed. Please try again.");
    }
  };

  // Get category icon
  // ========================================================================
  // ========================================================================
  
  const getCategoryIcon = (category) => {
    const categoryMap = {
      "Depression": "😔",
      "Anxiety": "😰",
      "OCD": "🔄",
      "PTSD": "💭",
      "Dissociative": "🌫️",
      "Somatic": "🏥",
      "Eating": "🍽️",
      "Substance": "🚫",
      "ADHD": "⚡",
      "Psychotic": "🧠",
      "Personality": "🎭"
    };
    return categoryMap[category] || "🧘";
  };

  // Loading state
  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid ${
            darkMode 
              ? "border-green-500 border-t-transparent" 
              : "border-green-600 border-t-transparent"
          }`}></div>
          <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Loading exercises...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`h-full flex items-center justify-center p-8 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className={`max-w-md text-center p-8 rounded-2xl ${
          darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
        }`}>
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className={`text-xl font-bold mb-2 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            Failed to Load Exercises
          </h3>
          <p className={`text-sm mb-4 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className={`px-6 py-3 rounded-xl font-medium ${
              darkMode
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-500 hover:bg-green-600"
            } text-white transition-colors`}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${showJournalSidebar ? 'mr-96' : ''}`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 backdrop-blur-md border-b ${
          darkMode 
            ? "bg-gray-900/80 border-gray-700" 
            : "bg-white/80 border-gray-200"
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${
                  darkMode 
                    ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                    : "bg-gradient-to-r from-green-400 to-emerald-500"
                }`}>
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className={`text-3xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    Mental Health Exercises
                  </h2>
                  <p className={`text-sm mt-1 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Evidence-based techniques for your mental wellness journey
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {filteredExercises.length} exercises
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`} />
              <input
                type="text"
                placeholder="Search exercises by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-12 py-4 rounded-2xl transition-all ${
                  darkMode
                    ? "bg-gray-800 text-white placeholder-gray-400 border-2 border-gray-700 focus:border-green-500"
                    : "bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 focus:border-green-400"
                } focus:outline-none focus:ring-2 focus:ring-green-400/20`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personalized Suggestions */}
        {!searchQuery && personalizedExercises.length > 0 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  Suggested For You
                </h3>
                <p className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Personalized exercises based on your journey
                </p>
              </div>
              <Star className={`h-5 w-5 ${
                darkMode ? "text-yellow-400" : "text-yellow-500"
              }`} fill="currentColor" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {personalizedExercises.map((exercise, index) => (
                <motion.div
                  key={`personalized-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer backdrop-blur-sm border-2 ${
                    darkMode
                      ? "bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-700/50 hover:border-green-500"
                      : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400"
                  } shadow-lg hover:shadow-xl transition-all`}
                  onClick={() => setSelectedExercise(exercise)}
                >
                  <div className="absolute top-2 right-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      darkMode ? "bg-yellow-900/50 text-yellow-300" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      Suggested
                    </div>
                  </div>
                  <div className="text-3xl mb-3">🌟</div>
                  <h4 className={`font-bold text-lg mb-2 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {exercise.name}
                  </h4>
                  <p className={`text-sm line-clamp-2 mb-4 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}>
                    {exercise.description.substring(0, 100)}...
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      darkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-700"
                    }`}>
                      {exercise.steps?.length || 0} steps
                    </span>
                    <ArrowRight className={`h-4 w-4 ${
                      darkMode ? "text-green-400" : "text-green-600"
                    }`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* All Exercises Grid */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              {searchQuery ? `Search Results (${filteredExercises.length})` : 'All Exercises'}
            </h3>
            {totalPages > 1 && (
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentExercises.map((exercise, index) => (
              <motion.div
                key={exercise.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`rounded-2xl p-6 cursor-pointer backdrop-blur-sm ${
                  darkMode
                    ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700"
                    : "bg-white/80 hover:bg-gray-50/80 border border-gray-200"
                } shadow-lg hover:shadow-xl transition-all`}
                onClick={() => setSelectedExercise(exercise)}
              >
                <div className="text-4xl mb-4">🧘</div>
                <h4 className={`font-bold text-lg mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  {exercise.name}
                </h4>
                <p className={`text-sm mb-4 line-clamp-3 ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                  {exercise.description.substring(0, 120)}...
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    darkMode ? "bg-gray-700 text-blue-400" : "bg-blue-100 text-blue-600"
                  }`}>
                    {exercise.steps?.length || 0} steps
                  </span>
                  <ArrowRight className={`h-5 w-5 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`} />
                </div>
              </motion.div>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className={`text-center py-12 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}>
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No exercises found</p>
              <p className="text-sm mt-2">Try adjusting your search terms</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === 1
                    ? darkMode
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : darkMode
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                  const showEllipsis =
                    (pageNum === currentPage - 2 && currentPage > 3) ||
                    (pageNum === currentPage + 2 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return (
                      <span
                        key={pageNum}
                        className={`px-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                      >
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[2.5rem] h-10 rounded-lg font-medium transition-all ${
                        currentPage === pageNum
                          ? darkMode
                            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                            : "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                          : darkMode
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-all ${
                  currentPage === totalPages
                    ? darkMode
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : darkMode
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Journal Sidebar */}
      <AnimatePresence>
        {showJournalSidebar && (
          <motion.div
            initial={{ x: 384 }}
            animate={{ x: 0 }}
            exit={{ x: 384 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed right-0 top-0 h-full w-96 border-l ${
              darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
            } shadow-2xl z-50 flex flex-col`}
          >
            {/* Journal Header */}
            <div className={`p-6 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    darkMode 
                      ? "bg-gradient-to-r from-purple-500 to-pink-600" 
                      : "bg-gradient-to-r from-purple-400 to-pink-500"
                  }`}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <h3 className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    Exercise Journal
                  </h3>
                </div>
              </div>
              <p className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Track your practice and reflections
              </p>
            </div>

            {/* Journal Entry Form */}
            <div className={`p-4 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <textarea
                value={newJournalEntry}
                onChange={(e) => setNewJournalEntry(e.target.value)}
                placeholder="How did this exercise make you feel? Write your reflections..."
                className={`w-full h-32 px-4 py-3 rounded-xl mb-3 resize-none ${
                  darkMode
                    ? "bg-gray-800 text-white placeholder-gray-400 border border-gray-700"
                    : "bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200"
                } focus:outline-none focus:ring-2 focus:ring-purple-400/20`}
              />
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input
                  type="text"
                  value={journalMood}
                  onChange={(e) => setJournalMood(e.target.value)}
                  placeholder="Mood"
                  className={`px-3 py-2 rounded-lg text-sm ${
                    darkMode
                      ? "bg-gray-800 text-white placeholder-gray-400 border border-gray-700"
                      : "bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-purple-400/20`}
                />
                <input
                  type="text"
                  value={journalTags}
                  onChange={(e) => setJournalTags(e.target.value)}
                  placeholder="Tags"
                  className={`px-3 py-2 rounded-lg text-sm ${
                    darkMode
                      ? "bg-gray-800 text-white placeholder-gray-400 border border-gray-700"
                      : "bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-purple-400/20`}
                />
              </div>

              <button
                onClick={handleSaveJournalEntry}
                disabled={journalLoading || !newJournalEntry.trim()}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center space-x-2 ${
                  darkMode
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-800"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400"
                } text-white disabled:cursor-not-allowed transition-all`}
              >
                <Save className="h-4 w-4" />
                <span>{journalLoading ? "Saving..." : "Save Entry"}</span>
              </button>
            </div>

            {/* Journal Entries List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className={`text-sm font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Recent Entries
                </h4>
                <button
                  onClick={() => setShowArchivedJournal(!showArchivedJournal)}
                  className={`text-xs px-3 py-1 rounded-lg ${
                    darkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {showArchivedJournal ? "Active" : "Archived"}
                </button>
              </div>

              {journalEntries.length === 0 ? (
                <div className={`text-center py-8 ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}>
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No journal entries yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journalEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl ${
                        darkMode ? "bg-gray-800" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}>
                          {entry.time_ago}
                        </span>
                        <button
                          onClick={() => handleDeleteJournalEntry(entry.id)}
                          className={`p-1 rounded ${
                            darkMode
                              ? "hover:bg-gray-700 text-gray-400"
                              : "hover:bg-gray-200 text-gray-500"
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className={`text-sm mb-2 ${
                        darkMode ? "text-gray-200" : "text-gray-700"
                      }`}>
                        {entry.content}
                      </p>
                      {(entry.mood || entry.tags) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {entry.mood && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                            }`}>
                              😊 {entry.mood}
                            </span>
                          )}
                          {entry.tags && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            }`}>
                              🏷️ {entry.tags}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise Detail Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedExercise(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-3xl ${
                darkMode ? "bg-gray-800" : "bg-white"
              } shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`sticky top-0 p-6 border-b ${
                darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              } z-10`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {selectedExercise.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                      }`}>
                        {selectedExercise.steps?.length || 0} steps
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExercise(null)}
                    className={`p-2 rounded-full ${
                      darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Description */}
                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-3 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    About This Exercise
                  </h4>
                  <p className={`text-sm leading-relaxed ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}>
                    {selectedExercise.description}
                  </p>
                </div>

                {/* Steps */}
                <div className="mb-6">
                  <h4 className={`text-lg font-semibold mb-3 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    How to Practice
                  </h4>
                  <div className="space-y-3">
                    {selectedExercise.steps?.map((step, index) => (
                      <div
                        key={index}
                        className={`flex space-x-3 p-4 rounded-xl ${
                          darkMode ? "bg-gray-700/50" : "bg-gray-50"
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          darkMode 
                            ? "bg-green-600 text-white" 
                            : "bg-green-500 text-white"
                        }`}>
                          {index + 1}
                        </div>
                        <p className={`text-sm flex-1 ${
                          darkMode ? "text-gray-200" : "text-gray-700"
                        }`}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      💡 Helpful Tips
                    </h4>
                    <ul className="space-y-2">
                      {(selectedExercise.tips || []).map((tip, index) => (
                        <li
                          key={index}
                          className={`flex items-start space-x-2 text-sm ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          <span className="text-green-500 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Completion */}
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickComplete(selectedExercise);
                    }}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      darkMode
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                        : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    } shadow-lg hover:shadow-xl`}
                  >
                    ✅ Mark As Completed
                  </button>
                  <p className={`mt-3 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Confirm you have finished all the steps to instantly update your progress tracker.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ExercisesModule;
