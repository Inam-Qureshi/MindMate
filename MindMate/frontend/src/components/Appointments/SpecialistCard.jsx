import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'react-feather';
import { ROUTES } from '../../config/routes';
import { getSafeImageUrl, getInitials } from '../../utils/imageUtils';
import './SpecialistCard.css';

const SpecialistCard = ({ 
  specialist, 
  onSelect, 
  onBook, 
  detailed = false, 
  darkMode 
}) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  // Validate specialist object
  if (!specialist || typeof specialist !== 'object') {
    return <div className="specialist-card-error">Invalid specialist data</div>;
  }

  const handleViewProfile = (e) => {
    e.stopPropagation();
    navigate(ROUTES.SPECIALIST_PROFILE_PAGE(specialist.id));
  };

  const handleBookAppointment = (e) => {
    e.stopPropagation();
    if (onBook) {
      onBook();
    }
  };

  const handleBookingCardClick = (e, consultationMode) => {
    e.stopPropagation();
    if (onBook) {
      onBook();
    }
  };


  const getSpecializationTags = (specializations) => {
    if (!specializations || !Array.isArray(specializations) || specializations.length === 0) return null;
    return specializations.slice(0, 7).map((spec, index) => {
      const specializationText = typeof spec === 'string' ? spec : (spec?.specialization || 'Unknown');
      return (
        <span key={index} className="specialization-tag">
          {String(specializationText)}
        </span>
      );
    });
  };

  const calculateSatisfaction = (rating) => {
    if (!rating) return 98;
    return Math.round(rating * 20);
  };

  return (
    <motion.div
      className={`specialist-card-marham ${darkMode ? 'dark' : ''}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar - Left Column */}
      <div className="card-avatar-container">
        <div className="avatar-circle-large">
          {getSafeImageUrl(specialist.profile_image_url) && !imageError ? (
            <img 
              src={getSafeImageUrl(specialist.profile_image_url)} 
              alt={String(specialist?.full_name || 'Specialist')}
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="avatar-initials">
              {getInitials(String(specialist?.full_name || ''))}
            </span>
          )}
        </div>
      </div>

      {/* Profile Info - Middle Column */}
      <div className="card-profile-info">
        <h3 className="specialist-full-name">{String(specialist?.full_name || 'Dr. Specialist')}</h3>
        <p className="specialist-specialization">{String(specialist?.specialist_type || 'Mental Health Specialist')}</p>
        
        {specialist?.qualifications && typeof specialist.qualifications === 'string' && (
          <p className="qualifications">{String(specialist.qualifications)}</p>
        )}

        {/* Stats Row */}
        <div className="card-stats-row">
          <div className="stat-item">
            <span className="stat-label">Reviews</span>
            <span className="stat-value">{String(specialist?.total_reviews || specialist?.review_count || 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Experience</span>
            <span className="stat-value">{String(specialist?.years_experience || 0)} Yrs</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Satisfaction</span>
            <span className="stat-value">{String(calculateSatisfaction(specialist?.rating || specialist?.average_rating))}%</span>
          </div>
        </div>
        
        {/* Specialty Tags */}
        {specialist.specializations && Array.isArray(specialist.specializations) && specialist.specializations.length > 0 && (
          <div className="card-tags">
            {getSpecializationTags(specialist.specializations)}
          </div>
        )}

        {/* Booking Cards - Under Profile Info */}
        <div className="booking-cards-container">
          {/* Video Consultation Card */}
          <div 
            className="booking-card video-card"
            onClick={(e) => handleBookingCardClick(e, 'online')}
          >
            <div className="booking-card-header">
              <span className="booking-type">Video Consultation</span>
              <span className="fast-confirm-badge">
                <CheckCircle size={12} />
                + Fast Confirm
              </span>
            </div>
            <div className="booking-availability">
              Available Tomorrow
            </div>
            <div className="booking-fee">
              Rs. {String(specialist?.consultation_fee || 'Contact for pricing')}
            </div>
          </div>

          {/* Clinic Consultation Card */}
          <div 
            className="booking-card clinic-card"
            onClick={(e) => handleBookingCardClick(e, 'in-person')}
          >
            <div className="booking-card-header">
              <span className="booking-type">Armed Forces Institute of Mental Health</span>
            </div>
            <div className="booking-availability">
              Available Tomorrow
            </div>
            <div className="booking-fee">
              Rs. {String(specialist?.consultation_fee || 'Contact for pricing')}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Right Column */}
      <div className="card-actions">
        <div className="action-buttons">
          <button
            className="btn-book-appointment"
            onClick={handleBookAppointment}
          >
            Book Appointment
          </button>
          <button
            className="btn-view-profile"
            onClick={handleViewProfile}
          >
            View Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SpecialistCard;