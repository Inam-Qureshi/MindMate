import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  MapPin, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  Star,
  MessageSquare,
  Phone,
  MoreVertical,
  ArrowRight
} from 'react-feather';

const AppointmentCard = ({ 
  appointment,
  statusIcon,
  statusLabel,
  statusColor,
  typeIcon,
  typeLabel,
  formattedDate,
  formattedTime,
  duration,
  isUpcoming,
  isPast,
  actionButtons,
  onSelect,
  darkMode 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    onSelect();
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action.onClick();
  };

  const getStatusBadgeColor = (color) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800';
      case 'red':
        return 'bg-red-100 text-red-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColorDark = (color) => {
    switch (color) {
      case 'green':
        return 'bg-green-900 text-green-200';
      case 'yellow':
        return 'bg-yellow-900 text-yellow-200';
      case 'red':
        return 'bg-red-900 text-red-200';
      case 'blue':
        return 'bg-blue-900 text-blue-200';
      default:
        return 'bg-gray-900 text-gray-200';
    }
  };

  return (
    <motion.div
      className={`appointment-card ${darkMode ? 'dark' : ''} ${statusColor}`}
      whileHover={{ 
        scale: 1.02, 
        y: -2,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="appointment-info">
          <div className="specialist-info">
            <div className="specialist-avatar">
              {appointment.specialist_avatar ? (
                <img 
                  src={appointment.specialist_avatar} 
                  alt={appointment.specialist_name}
                />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="specialist-details">
              <h4 className="specialist-name">{appointment.specialist_name}</h4>
              <p className="specialist-title">{appointment.specialist_specialty}</p>
            </div>
          </div>
          
          <div className="appointment-status">
            <div className={`status-badge ${darkMode ? getStatusBadgeColorDark(statusColor) : getStatusBadgeColor(statusColor)}`}>
              {statusIcon}
              <span>{statusLabel}</span>
            </div>
          </div>
        </div>
        
        <div className="card-actions">
          <button 
            className="more-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <div className="appointment-details">
          <div className="detail-item">
            <Calendar size={16} />
            <div className="detail-content">
              <span className="detail-label">Date</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
          </div>
          
          <div className="detail-item">
            <Clock size={16} />
            <div className="detail-content">
              <span className="detail-label">Time</span>
              <span className="detail-value">{formattedTime}</span>
            </div>
          </div>
          
          <div className="detail-item">
            {typeIcon}
            <div className="detail-content">
              <span className="detail-label">Type</span>
              <span className="detail-value">{typeLabel}</span>
            </div>
          </div>
          
          <div className="detail-item">
            <Clock size={16} />
            <div className="detail-content">
              <span className="detail-label">Duration</span>
              <span className="detail-value">{duration} minutes</span>
            </div>
          </div>
        </div>

        {/* Session Notes Preview */}
        {appointment.notes && (
          <div className="notes-preview">
            <p className="notes-text">{appointment.notes}</p>
          </div>
        )}

        {/* Time Indicators */}
        <div className="time-indicators">
          {isUpcoming && (
            <div className="upcoming-indicator">
              <Clock size={14} />
              <span>Upcoming</span>
            </div>
          )}
          
          {isPast && (
            <div className="past-indicator">
              <CheckCircle size={14} />
              <span>Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {actionButtons.length > 0 && (
        <div className="card-footer">
          <div className="action-buttons">
            {actionButtons.map((button, index) => (
              <motion.button
                key={index}
                className={`action-btn ${button.className}`}
                onClick={(e) => handleActionClick(e, button)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {button.icon}
                <span>{button.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <motion.div
        className="hover-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="overlay-content">
          <button className="overlay-btn">
            <MessageSquare size={16} />
            Message
          </button>
          <button className="overlay-btn">
            <Phone size={16} />
            Call
          </button>
          <button className="overlay-btn">
            <ArrowRight size={16} />
            View Details
          </button>
        </div>
      </motion.div>

      {/* Quick Actions Dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="actions-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-content">
              <button className="dropdown-item">
                <MessageSquare size={16} />
                <span>Message Specialist</span>
              </button>
              <button className="dropdown-item">
                <Phone size={16} />
                <span>Call Specialist</span>
              </button>
              <button className="dropdown-item">
                <Calendar size={16} />
                <span>Reschedule</span>
              </button>
              <button className="dropdown-item">
                <Star size={16} />
                <span>Rate Session</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AppointmentCard;
