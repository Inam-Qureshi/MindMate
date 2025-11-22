import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, User, Calendar, Heart, Award, ArrowUp } from 'react-feather';
import axios from 'axios';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import EmptyState from '../../shared/EmptyState';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ReviewsDisplay = ({ darkMode, specialistId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [currentSpecialistId, setCurrentSpecialistId] = useState(specialistId);

  // Fetch current specialist ID if not provided
  useEffect(() => {
    const fetchCurrentSpecialist = async () => {
      if (!specialistId) {
        try {
          const token = localStorage.getItem('access_token');
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentSpecialistId(response.data.id);
        } catch (err) {
          console.error('Error fetching current specialist ID:', err);
        }
      }
    };

    fetchCurrentSpecialist();
  }, [specialistId]);

  // Fetch reviews
  const fetchReviews = async () => {
    if (!currentSpecialistId) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${API_URL}/api/specialists/${currentSpecialistId}/reviews?limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setReviews(response.data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.response?.data?.detail || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSpecialistId) {
      fetchReviews();
    }
  }, [currentSpecialistId]);

  // Calculate statistics
  const calculateStats = () => {
    if (reviews.length === 0) return null;

    const totalReviews = reviews.length;
    const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1);
    
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    // Calculate sub-ratings averages
    const communicationReviews = reviews.filter(r => r.communication_rating);
    const avgCommunication = communicationReviews.length > 0
      ? (communicationReviews.reduce((sum, r) => sum + r.communication_rating, 0) / communicationReviews.length).toFixed(1)
      : null;

    const professionalismReviews = reviews.filter(r => r.professionalism_rating);
    const avgProfessionalism = professionalismReviews.length > 0
      ? (professionalismReviews.reduce((sum, r) => sum + r.professionalism_rating, 0) / professionalismReviews.length).toFixed(1)
      : null;

    const effectivenessReviews = reviews.filter(r => r.effectiveness_rating);
    const avgEffectiveness = effectivenessReviews.length > 0
      ? (effectivenessReviews.reduce((sum, r) => sum + r.effectiveness_rating, 0) / effectivenessReviews.length).toFixed(1)
      : null;

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      avgCommunication,
      avgProfessionalism,
      avgEffectiveness
    };
  };

  // Filter reviews by rating
  const filteredReviews = filterRating === 'all'
    ? reviews
    : reviews.filter(r => r.rating === parseInt(filterRating));

  // Render star rating
  const renderStars = (rating, size = 'h-5 w-5') => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : darkMode ? 'text-gray-600' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const stats = calculateStats();

  if (loading) {
    return <LoadingState message="Loading reviews..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchReviews} />;
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No Reviews Yet"
        message="You haven't received any patient reviews yet. Reviews will appear here once patients complete their sessions and leave feedback."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Reviews & Ratings
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          See what your patients are saying about you
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Average Rating */}
          <div className={`p-6 rounded-xl text-center ${
            darkMode ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border border-yellow-700' : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200'
          }`}>
            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              {stats.averageRating}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(parseFloat(stats.averageRating)))}
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Average Rating
            </p>
          </div>

          {/* Total Reviews */}
          <div className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-center mb-2">
              <MessageSquare className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.totalReviews}
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Reviews
            </p>
          </div>

          {/* Communication */}
          {stats.avgCommunication && (
            <div className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className={`h-8 w-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.avgCommunication}
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Communication
              </p>
            </div>
          )}

          {/* Professionalism */}
          {stats.avgProfessionalism && (
            <div className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center justify-center mb-2">
                <Award className={`h-8 w-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.avgProfessionalism}
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Professionalism
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rating Distribution */}
      {stats && (
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Rating Distribution
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.ratingDistribution[rating];
              const percentage = (count / stats.totalReviews) * 100;
              return (
                <div key={rating} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 w-20">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {rating}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className={`h-3 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-sm font-medium w-16 text-right ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {count} ({percentage.toFixed(0)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Filter by rating:
        </label>
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing {filteredReviews.length} of {reviews.length} reviews
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-6 rounded-xl border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            {/* Review Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <User className={`h-6 w-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {review.is_anonymous ? 'Anonymous Patient' : review.patient_name || 'Patient'}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {renderStars(review.rating)}
            </div>

            {/* Sub-ratings */}
            {(review.communication_rating || review.professionalism_rating || review.effectiveness_rating) && (
              <div className="flex flex-wrap gap-4 mb-4">
                {review.communication_rating && (
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Communication:
                    </span>
                    {renderStars(review.communication_rating, 'h-4 w-4')}
                  </div>
                )}
                {review.professionalism_rating && (
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Professionalism:
                    </span>
                    {renderStars(review.professionalism_rating, 'h-4 w-4')}
                  </div>
                )}
                {review.effectiveness_rating && (
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Effectiveness:
                    </span>
                    {renderStars(review.effectiveness_rating, 'h-4 w-4')}
                  </div>
                )}
              </div>
            )}

            {/* Review Text */}
            {review.review_text && (
              <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {review.review_text}
              </p>
            )}

            {/* Specialist Response */}
            {review.specialist_response && (
              <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                darkMode
                  ? 'bg-gray-900 border-emerald-600'
                  : 'bg-emerald-50 border-emerald-500'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Heart className={`h-4 w-4 ${
                    darkMode ? 'text-emerald-400' : 'text-emerald-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    Your Response
                  </span>
                  {review.specialist_response_at && (
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      • {new Date(review.specialist_response_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {review.specialist_response}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <EmptyState
          icon={Star}
          title="No Reviews Match Filter"
          message="Try selecting a different rating filter to see more reviews."
        />
      )}
    </div>
  );
};

export default ReviewsDisplay;

