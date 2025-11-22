import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Search, 
  Filter, 
  Calendar, 
  Star, 
  MapPin, 
  Clock, 
  DollarSign, 
  User, 
  X, 
  Loader, 
  ChevronDown,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Info
} from 'react-feather';
import { API_URL, API_ENDPOINTS } from '../../../config/api';
import { ROUTES } from '../../../config/routes';

// ApiManager for request deduplication
class ApiManager {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicatedRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

const FavoritesModule = ({ darkMode, activeSidebarItem }) => {
  const navigate = useNavigate();
  // State management
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("favorited_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterType, setFilterType] = useState("all");
  const [selectedFavorites, setSelectedFavorites] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);

  const apiManager = useRef(new ApiManager());

  // Load favorites on component mount
  useEffect(() => {
    loadFavorites();
  }, [activeSidebarItem]);

  // Filter and sort favorites when dependencies change
  useEffect(() => {
    filterAndSortFavorites();
  }, [favorites, searchQuery, sortBy, sortOrder, filterType]);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load favorites from API
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiManager.current.deduplicatedRequest(
        'favorites_list',
        async () => {
          const token = localStorage.getItem("access_token");
          const response = await axios.get(`${API_URL}${API_ENDPOINTS.SPECIALISTS.FAVORITES}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return response.data;
        }
      );

      setFavorites(result);
    } catch (error) {
      console.error("Error loading favorites:", error);
      setError("Failed to load favorites. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort favorites
  const filterAndSortFavorites = () => {
    let filtered = [...favorites];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fav => 
        fav.specialist_name.toLowerCase().includes(query) ||
        fav.specialist_type?.toLowerCase().includes(query) ||
        fav.city?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(fav => 
        fav.specialist_type?.toLowerCase() === filterType.toLowerCase()
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.specialist_name.toLowerCase();
          bValue = b.specialist_name.toLowerCase();
          break;
        case "type":
          aValue = a.specialist_type?.toLowerCase() || "";
          bValue = b.specialist_type?.toLowerCase() || "";
          break;
        case "rating":
          aValue = a.average_rating || 0;
          bValue = b.average_rating || 0;
          break;
        case "fee":
          aValue = a.consultation_fee || 0;
          bValue = b.consultation_fee || 0;
          break;
        case "favorited_at":
        default:
          aValue = new Date(a.favorited_at);
          bValue = new Date(b.favorited_at);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredFavorites(filtered);
  };

  // Remove favorite
  const removeFavorite = async (specialistId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("access_token");
      
      await axios.post(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.FAVORITE(specialistId)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setFavorites(prev => prev.filter(fav => fav.specialist_id !== specialistId));
      setSelectedFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(specialistId);
        return newSet;
      });

      setNotification({
        type: 'success',
        message: 'Specialist removed from favorites!'
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      setNotification({
        type: 'error',
        message: 'Failed to remove favorite. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk remove favorites
  const bulkRemoveFavorites = async () => {
    if (selectedFavorites.size === 0) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("access_token");
      
      // Remove all selected favorites
      await Promise.all(
        Array.from(selectedFavorites).map(specialistId =>
          axios.post(
            `${API_URL}${API_ENDPOINTS.SPECIALISTS.FAVORITE(specialistId)}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      // Update local state
      setFavorites(prev => 
        prev.filter(fav => !selectedFavorites.has(fav.specialist_id))
      );
      setSelectedFavorites(new Set());

      setNotification({
        type: 'success',
        message: `${selectedFavorites.size} specialists removed from favorites!`
      });
    } catch (error) {
      console.error("Error bulk removing favorites:", error);
      setNotification({
        type: 'error',
        message: 'Failed to remove some favorites. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // View specialist details
  const viewSpecialist = (favorite) => {
    setSelectedSpecialist(favorite);
    setShowSpecialistModal(true);
  };

  // Book appointment with specialist
  const bookAppointment = (specialistId) => {
    // Navigate to specialists page with this specialist selected
    navigate(`${ROUTES.SPECIALISTS || '/home/specialists'}?specialist=${specialistId}`);
  };

  // Toggle favorite selection
  const toggleSelection = (specialistId) => {
    setSelectedFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(specialistId)) {
        newSet.delete(specialistId);
      } else {
        newSet.add(specialistId);
      }
      return newSet;
    });
  };

  // Select all favorites
  const selectAll = () => {
    if (selectedFavorites.size === filteredFavorites.length) {
      setSelectedFavorites(new Set());
    } else {
      setSelectedFavorites(new Set(filteredFavorites.map(fav => fav.specialist_id)));
    }
  };

  // Get unique specialist types for filter
  const getSpecialistTypes = () => {
    const types = [...new Set(favorites.map(fav => fav.specialist_type).filter(Boolean))];
    return types.sort();
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Loading your favorites...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}>
          My Favorite Specialists
        </h1>
        <p className={`text-base sm:text-lg ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          Manage your bookmarked mental health professionals
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadFavorites();
              }}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg border ${
              notification.type === 'success'
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
            }`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className={`mb-6 p-4 sm:p-6 rounded-xl shadow-lg ${
        darkMode ? "bg-gray-800/90 border border-gray-700" : "bg-white border border-gray-200"
      }`}>
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search favorites by name, type, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 rounded-lg border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
            }`}
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Quick Stats */}
            <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {filteredFavorites.length} of {favorites.length} favorites
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedFavorites.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {selectedFavorites.size} selected
              </span>
              <button
                onClick={bulkRemoveFavorites}
                disabled={actionLoading}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sort By */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="favorited_at">Date Added</option>
                    <option value="name">Name</option>
                    <option value="type">Specialist Type</option>
                    <option value="rating">Rating</option>
                    <option value="fee">Consultation Fee</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Order
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>

                {/* Filter by Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Specialist Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="all">All Types</option>
                    {getSpecialistTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Favorites List */}
      {filteredFavorites.length === 0 ? (
        <div className={`text-center py-12 ${
          darkMode ? "text-gray-400" : "text-gray-500"
        }`}>
          {favorites.length === 0 ? (
            <>
              <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">No favorites yet</h3>
              <p className="text-base mb-4">Start adding specialists to your favorites to see them here</p>
              <button
                onClick={() => navigate(ROUTES.SPECIALISTS || '/home/specialists')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Browse Specialists
              </button>
            </>
          ) : (
            <>
              <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">No matches found</h3>
              <p className="text-base">Try adjusting your search or filters</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          {filteredFavorites.length > 0 && (
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                checked={selectedFavorites.size === filteredFavorites.length && filteredFavorites.length > 0}
                onChange={selectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className={`text-sm font-medium ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Select All ({filteredFavorites.length})
              </label>
            </div>
          )}

          {/* Favorites Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredFavorites.map((favorite) => (
              <motion.div
                key={favorite.specialist_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-6 rounded-xl shadow-lg border transition-all duration-200 ${
                  selectedFavorites.has(favorite.specialist_id)
                    ? darkMode
                      ? "bg-indigo-900/20 border-indigo-500"
                      : "bg-indigo-50 border-indigo-300"
                    : darkMode
                    ? "bg-gray-800/90 border-gray-700 hover:border-indigo-500"
                    : "bg-white border-gray-200 hover:border-indigo-300"
                } hover:shadow-xl`}
              >
                {/* Header with Checkbox */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedFavorites.has(favorite.specialist_id)}
                      onChange={() => toggleSelection(favorite.specialist_id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      darkMode ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {favorite.specialist_name.charAt(0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Added {formatDate(favorite.favorited_at)}
                    </div>
                  </div>
                </div>

                {/* Specialist Info */}
                <div className="mb-4">
                  <h3 className={`text-lg font-bold mb-1 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {favorite.specialist_name}
                  </h3>
                  <p className={`text-sm mb-3 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {favorite.specialist_type || "Mental Health Professional"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {favorite.average_rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                          {favorite.average_rating}
                        </span>
                      </div>
                    )}

                    {favorite.consultation_fee && (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                          ${favorite.consultation_fee}
                        </span>
                      </div>
                    )}

                    {favorite.city && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                          {favorite.city}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => viewSpecialist(favorite)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => bookAppointment(favorite.specialist_id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Book</span>
                  </button>

                  <button
                    onClick={() => removeFavorite(favorite.specialist_id)}
                    disabled={actionLoading}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from favorites"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Specialist Details Modal */}
      <AnimatePresence>
        {showSpecialistModal && selectedSpecialist && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowSpecialistModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`max-w-md w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
                darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Specialist Details</h2>
                  <button
                    onClick={() => setShowSpecialistModal(false)}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Specialist Info */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                      darkMode ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {selectedSpecialist.specialist_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{selectedSpecialist.specialist_name}</h3>
                      <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                        {selectedSpecialist.specialist_type || "Mental Health Professional"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedSpecialist.average_rating && (
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span>{selectedSpecialist.average_rating} Rating</span>
                      </div>
                    )}

                    {selectedSpecialist.consultation_fee && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span>${selectedSpecialist.consultation_fee}</span>
                      </div>
                    )}

                    {selectedSpecialist.city && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{selectedSpecialist.city}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-400 fill-current" />
                      <span>Favorited {formatDate(selectedSpecialist.favorited_at)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => bookAppointment(selectedSpecialist.specialist_id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Calendar className="h-5 w-5" />
                      <span>Book Appointment</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FavoritesModule;
