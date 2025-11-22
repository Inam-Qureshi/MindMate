import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, Play, Loader, CheckCircle, Clock, Target, TrendingUp } from 'react-feather';
import axios from 'axios';
import Modal from './Modal';
import { API_URL, API_ENDPOINTS } from '../../config/api';
import { AuthStorage } from '../../utils/localStorage';
import toast from 'react-hot-toast';
import './StartExerciseModal.css';

const StartExerciseModal = ({ isOpen, onClose, darkMode, onComplete }) => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const detailsRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadExercises();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedExercise && !started && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedExercise, started]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.EXERCISES.LIST}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const exercisesData = response.data?.exercises || [];
      setExercises(exercisesData);
    } catch (err) {
      console.error('Error loading exercises:', err);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExercise = async () => {
    if (!selectedExercise) {
      toast.error('Please select an exercise');
      return;
    }

    setStarting(true);
    try {
      const token = AuthStorage.getToken();
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.SESSIONS_START}`,
        {
          exercise_name: selectedExercise.name,
          exercise_category: 'general', // Default category since exercises.json doesn't have category field
          mood_before: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSessionId(response.data.id);
      setStarted(true);
      toast.success('Exercise session started!');

      // Trigger dashboard refresh
      window.dispatchEvent(new Event('dashboard-refresh'));

      // Call onComplete callback
      if (onComplete) {
        onComplete({
          sessionId: response.data.id,
          exercise: selectedExercise,
        });
      }

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      console.error('Error starting exercise session:', err);
      toast.error(err.response?.data?.detail || 'Failed to start exercise session');
    } finally {
      setStarting(false);
    }
  };

  const handleClose = () => {
    setSelectedExercise(null);
    setLoading(false);
    setStarting(false);
    setStarted(false);
    setSessionId(null);
    onClose();
  };

  const getExerciseIcon = (exercise) => {
    // Determine icon based on exercise name or description
    const name = exercise?.name?.toLowerCase() || '';
    const desc = exercise?.description?.toLowerCase() || '';
    
    if (name.includes('breathing') || desc.includes('breathing')) {
      return '🧘';
    } else if (name.includes('meditation') || desc.includes('meditation')) {
      return '🧠';
    } else if (name.includes('movement') || name.includes('exercise') || desc.includes('movement')) {
      return '🏃';
    } else if (name.includes('mindful') || desc.includes('mindful')) {
      return '🌿';
    } else if (name.includes('gratitude') || desc.includes('gratitude')) {
      return '🙏';
    } else if (name.includes('journal') || desc.includes('journal')) {
      return '📝';
    } else {
      return '✨';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start Exercise"
      darkMode={darkMode}
      size="large"
    >
      <div className={`start-exercise-modal ${darkMode ? 'dark' : ''}`}>
        {loading ? (
          <div className="loading-state">
            <Loader className="spinner" size={32} />
            <p>Loading exercises...</p>
          </div>
        ) : started ? (
          <motion.div
            className="success-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle size={48} className="success-icon" />
            <h3>Session Started!</h3>
            <p>Your exercise session has begun. Good luck!</p>
            <div className="session-info">
              <div className="info-item">
                <Activity size={20} />
                <span>{selectedExercise?.name}</span>
              </div>
              <div className="info-item">
                <Clock size={20} />
                <span>Session ID: {sessionId}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="exercise-selection">
              <h3>Select an Exercise</h3>
              <p className="subtitle">Choose a mental health exercise to begin your session</p>

              <div className="exercises-grid">
                {exercises.length === 0 ? (
                  <div className="empty-state">
                    <Activity size={48} />
                    <p>No exercises available</p>
                  </div>
                ) : (
                  exercises.map((exercise) => (
                    <motion.button
                      key={exercise.name}
                      className={`exercise-card ${selectedExercise?.name === exercise.name ? 'selected' : ''}`}
                      onClick={() => setSelectedExercise(exercise)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="exercise-icon">
                        {getExerciseIcon(exercise)}
                      </div>
                      <div className="exercise-info">
                        <h4>{exercise.name}</h4>
                        {exercise.description && (
                          <p className="exercise-description">
                            {exercise.description.length > 100
                              ? `${exercise.description.substring(0, 100)}...`
                              : exercise.description}
                          </p>
                        )}
                        {exercise.steps && exercise.steps.length > 0 && (
                          <span className="exercise-category">
                            {exercise.steps.length} steps
                          </span>
                        )}
                      </div>
                      {selectedExercise?.name === exercise.name && (
                        <div className="selected-indicator">
                          <CheckCircle size={20} />
                        </div>
                      )}
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {selectedExercise && (
              <motion.div
                ref={detailsRef}
                className="exercise-details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h4>Exercise Details</h4>
                <div className="details-content">
                  <div className="detail-item">
                    <Target size={18} />
                    <div>
                      <span className="detail-label">Name</span>
                      <span className="detail-value">{selectedExercise.name}</span>
                    </div>
                  </div>
                  {selectedExercise.steps && selectedExercise.steps.length > 0 && (
                    <div className="detail-item">
                      <Activity size={18} />
                      <div>
                        <span className="detail-label">Steps</span>
                        <span className="detail-value">{selectedExercise.steps.length} steps</span>
                      </div>
                    </div>
                  )}
                  {selectedExercise.description && (
                    <div className="detail-item full-width">
                      <TrendingUp size={18} />
                      <div>
                        <span className="detail-label">Description</span>
                        <p className="detail-description">{selectedExercise.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="modal-actions">
              <button
                onClick={handleClose}
                className="cancel-btn"
                disabled={starting}
              >
                Cancel
              </button>
              <button
                onClick={handleStartExercise}
                className="start-btn"
                disabled={!selectedExercise || starting}
              >
                {starting ? (
                  <>
                    <Loader className="spinner" size={18} />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Start Exercise
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default StartExerciseModal;

