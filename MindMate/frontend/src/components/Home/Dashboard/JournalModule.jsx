import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BookOpen } from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const JournalModule = ({ darkMode, activeSidebarItem = "new-entry" }) => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Get content based on active sidebar item
  const getSidebarContent = () => {
    switch (activeSidebarItem) {
      case "new-entry":
        return {
          title: "Daily Journal",
          description: "Reflect on your thoughts and feelings",
          emptyMessage: "No journal entries yet. Start writing above!"
        };
      case "today":
        return {
          title: "Today's Entries",
          description: "Your journal entries from today",
          emptyMessage: "No entries for today. Start your day with reflection!"
        };
      case "mood-tracker":
        return {
          title: "Mood Tracker",
          description: "Track your emotional journey over time",
          emptyMessage: "No mood entries yet. Start tracking your emotions!"
        };
      case "insights":
        return {
          title: "Journal Insights",
          description: "Analytics and patterns from your journal",
          emptyMessage: "No insights available yet. Keep writing to see patterns!"
        };
      default:
        return {
          title: "Daily Journal",
          description: "Reflect on your thoughts and feelings",
          emptyMessage: "No journal entries yet. Start writing above!"
        };
    }
  };

  // Fetch journal entries on component mount and when sidebar item changes
  useEffect(() => {
    fetchEntries();
    
    // Set up HTTP polling for real-time updates
    const pollInterval = setInterval(() => {
      fetchEntries();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [showArchived, activeSidebarItem]);

  const fetchEntries = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");

      // Build filter parameters based on activeSidebarItem
      let params = { archived: showArchived };

      switch (activeSidebarItem) {
        case "today": {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
          params.date_from = startOfDay.toISOString();
          params.date_to = endOfDay.toISOString();
          break;
        }
        case "mood-tracker":
          params.include_mood = true;
          break;
        case "insights":
          params.include_analytics = true;
          break;
        default:
          // new-entry shows all entries
          break;
      }

      const response = await axios.get(`${API_URL}${API_ENDPOINTS.JOURNAL.ENTRIES}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });

      setEntries(response.data);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
    }
  }, [API_URL, activeSidebarItem, showArchived]);

  const handleSaveEntry = async () => {
    if (newEntry.trim() === "") return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.JOURNAL.ENTRIES}`,
        {
          content: newEntry,
          mood: mood || null,
          tags: tags || null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Add new entry to the list
      setEntries([response.data, ...entries]);
      
      // Clear form
      setNewEntry("");
      setMood("");
      setTags("");
    } catch (error) {
      console.error("Error saving journal entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to permanently delete this entry?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}${API_ENDPOINTS.JOURNAL.ENTRY_DELETE(entryId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove entry from list
      setEntries(entries.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error("Error deleting journal entry:", error);
    }
  };

  const handleToggleArchive = async (entryId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.patch(`${API_URL}${API_ENDPOINTS.JOURNAL.ENTRY_ARCHIVE(entryId)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh entries
      fetchEntries();
    } catch (error) {
      console.error("Error toggling archive status:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className={`p-6 border-b ${
          darkMode ? "border-gray-700 bg-gray-800/80 backdrop-blur-sm" : "border-gray-200 bg-white/80 backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${darkMode ? "bg-gradient-to-r from-purple-500 to-pink-600" : "bg-gradient-to-r from-purple-400 to-pink-500"}`}>
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2
              className={`text-2xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {getSidebarContent().title}
            </h2>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {getSidebarContent().description}
            </p>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div
        className={`p-4 border-b ${
          darkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder="Write your thoughts here..."
          className={`w-full h-40 px-6 py-4 rounded-2xl mb-6 transition-all duration-200 ${
            darkMode
              ? "bg-gray-700/80 text-white placeholder-gray-400 border-2 border-gray-600 focus:border-purple-400"
              : "bg-white/80 text-gray-800 placeholder-gray-500 border-2 border-gray-300 focus:border-purple-400"
          } focus:outline-none focus:ring-2 focus:ring-purple-400/20`}
        />
        
        {/* Mood and Tags */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Mood (optional)"
            className={`px-4 py-2 rounded-lg ${
              darkMode
                ? "bg-gray-700 text-white placeholder-gray-400"
                : "bg-white text-gray-800 placeholder-gray-500"
            } border ${
              darkMode
                ? "border-gray-600 focus:border-blue-500"
                : "border-gray-300 focus:border-blue-400"
            } focus:outline-none focus:ring-1 ${
              darkMode ? "focus:ring-blue-500" : "focus:ring-blue-400"
            }`}
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (optional)"
            className={`px-4 py-2 rounded-lg ${
              darkMode
                ? "bg-gray-700 text-white placeholder-gray-400"
                : "bg-white text-gray-800 placeholder-gray-500"
            } border ${
              darkMode
                ? "border-gray-600 focus:border-blue-500"
                : "border-gray-300 focus:border-blue-400"
            } focus:outline-none focus:ring-1 ${
              darkMode ? "focus:ring-blue-500" : "focus:ring-blue-400"
            }`}
          />
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveEntry}
          disabled={loading}
          className={`px-8 py-4 rounded-2xl font-medium shadow-lg transition-all duration-200 ${
            darkMode
              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500"
          } text-white disabled:cursor-not-allowed`}
        >
          {loading ? "Saving..." : "Save Entry"}
        </motion.button>
      </div>

      {/* Archive Toggle */}
      <div
        className={`p-4 border-b ${
          darkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-sm ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {showArchived ? "Showing archived entries" : "Showing active entries"}
          </span>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div
            className={`text-center py-10 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {getSidebarContent().emptyMessage}
          </div>
        ) : (
          entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 mb-4 rounded-lg ${
                darkMode ? "bg-gray-800" : "bg-white"
              } shadow`}
            >
              <div className="flex justify-between items-start mb-2">
                <div
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {entry.time_ago}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleArchive(entry.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    {entry.is_archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div
                className={`mt-2 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {entry.content}
              </div>
              
              {/* Mood and Tags */}
              {(entry.mood || entry.tags) && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  {entry.mood && (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs mr-2 ${
                        darkMode
                          ? "bg-blue-900 text-blue-200"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      😊 {entry.mood}
                    </span>
                  )}
                  {entry.tags && (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        darkMode
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                        }`}
                    >
                      🏷️ {entry.tags}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default JournalModule;
