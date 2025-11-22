import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MessageCircle, ThumbsUp, Shield, Zap, AlertCircle, CheckCircle } from 'react-feather';
import { API_ENDPOINTS } from '../../config/api';
import apiClient from '../../utils/axiosConfig';

const ReviewModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  darkMode, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    rating: 0,
    review_text: '',
    communication_rating: 0,
    professionalism_rating: 0,
    effectiveness_rating: 0,
    is_anonymous: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const appointmentId = appointment.appointment_id || appointment.id;
      if (!appointmentId) {
        setError('Invalid appointment');
        setLoading(false);
        return;
      }
      
      // Validate required fields
      if (formData.rating === 0) {
        setError('Please provide an overall rating');
        setLoading(false);
        return;
      }
      
      // Submit review using the API endpoint
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.SUBMIT_REVIEW(appointmentId),
        {
          rating: formData.rating,
          review_text: formData.review_text?.trim() || null,
          communication_rating: formData.communication_rating > 0 ? formData.communication_rating : null,
          professionalism_rating: formData.professionalism_rating > 0 ? formData.professionalism_rating : null,
          effectiveness_rating: formData.effectiveness_rating > 0 ? formData.effectiveness_rating : null,
          is_anonymous: formData.is_anonymous
        }
      );

      if (response.status === 200 || response.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(response.data);
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to submit review. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (rating, type = 'rating') => {
    setFormData(prev => ({
      ...prev,
      [type]: rating
    }));
  };

  const StarRating = ({ rating, onRatingChange, type = 'rating', label, icon }) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-lg">{icon}</div>}
          <label className={`text-sm font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {label}
          </label>
        </div>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className={`transition-colors ${
                star <= rating
                  ? 'text-yellow-400 hover:text-yellow-500'
                  : darkMode
                    ? 'text-gray-600 hover:text-gray-500'
                    : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              <Star className="w-6 h-6 fill-current" />
            </button>
          ))}
          {rating > 0 && (
            <span className={`ml-2 text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {rating}/5
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                darkMode ? 'bg-yellow-600' : 'bg-yellow-100'
              }`}>
                <Star className={`w-5 h-5 ${
                  darkMode ? 'text-yellow-300' : 'text-yellow-600'
                }`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Submit Review</h2>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Rate your experience with {appointment?.specialist_name || 'Specialist'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  darkMode ? 'bg-green-600' : 'bg-green-100'
                }`}>
                  <CheckCircle className={`w-8 h-8 ${
                    darkMode ? 'text-green-300' : 'text-green-600'
                  }`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">Review Submitted!</h3>
                <p className={`${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Thank you for your feedback. Your review helps other patients make informed decisions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Overall Rating */}
                <div>
                  <StarRating
                    rating={formData.rating}
                    onRatingChange={(rating) => handleRatingChange(rating, 'rating')}
                    label="Overall Rating *"
                    icon="⭐"
                  />
                  <p className={`text-xs mt-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    How would you rate your overall experience?
                  </p>
                </div>

                {/* Detailed Ratings */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Detailed Ratings (Optional)
                  </h3>
                  
                  <StarRating
                    rating={formData.communication_rating}
                    onRatingChange={(rating) => handleRatingChange(rating, 'communication_rating')}
                    label="Communication"
                    icon="💬"
                  />
                  
                  <StarRating
                    rating={formData.professionalism_rating}
                    onRatingChange={(rating) => handleRatingChange(rating, 'professionalism_rating')}
                    label="Professionalism"
                    icon="🛡️"
                  />
                  
                  <StarRating
                    rating={formData.effectiveness_rating}
                    onRatingChange={(rating) => handleRatingChange(rating, 'effectiveness_rating')}
                    label="Effectiveness"
                    icon="⚡"
                  />
                </div>

                {/* Review Text */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Written Review (Optional)
                  </label>
                  <textarea
                    name="review_text"
                    value={formData.review_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, review_text: e.target.value }))}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Share your experience in detail. What went well? What could be improved?"
                  />
                  <p className={`text-xs mt-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Your detailed feedback helps both the specialist and future patients.
                  </p>
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_anonymous"
                    checked={formData.is_anonymous}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                    className={`w-4 h-4 rounded border-2 focus:ring-2 focus:ring-yellow-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-yellow-600' 
                        : 'bg-white border-gray-300 text-yellow-600'
                    }`}
                  />
                  <label htmlFor="is_anonymous" className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Submit anonymously
                  </label>
                </div>

                {/* Appointment Info */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Appointment Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <strong>Specialist:</strong> {appointment?.specialist_name}
                    </p>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <strong>Date:</strong> {appointment?.scheduled_start ? new Date(appointment.scheduled_start).toLocaleDateString() : 'Not specified'}
                    </p>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <strong>Mode:</strong> {appointment?.appointment_type === 'online' || appointment?.appointment_type === 'virtual' 
                        ? 'Online Consultation' 
                        : appointment?.appointment_type === 'in_person' 
                          ? 'In-Person Visit' 
                          : appointment?.consultation_mode?.replace('_', ' ') || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                    darkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-700'
                  }`}>
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || formData.rating === 0}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      loading || formData.rating === 0
                        ? darkMode
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting Review...</span>
                      </div>
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReviewModal;
