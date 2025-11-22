/**
 * Appointments Widget - Appointments Overview
 * ==========================================
 * Displays upcoming and recent appointments.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video } from 'react-feather';
import BaseWidget from './BaseWidget';
import { formatDate, formatRelativeTime } from '../Utils/dashboardUtils';
import './AppointmentsWidget.css';

const AppointmentsWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  const appointments = data?.appointments || [];
  
  return (
    <BaseWidget
      title="Appointments"
      subtitle="Upcoming and recent sessions"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      darkMode={darkMode}
      size="medium"
      {...props}
    >
      <div className="appointments-widget">
        {appointments.length > 0 ? (
          <div className="appointments-list">
            {appointments.slice(0, 3).map((appointment, index) => (
              <motion.div
                key={appointment.id}
                className="appointment-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="appointment-header">
                  <div className="appointment-time">
                    <Clock size={16} />
                    <span>{formatDate(appointment.appointment_date)}</span>
                  </div>
                  <div className={`appointment-status ${appointment.status}`}>
                    {appointment.status}
                  </div>
                </div>
                
                <div className="appointment-details">
                  <h4>{appointment.specialist_name}</h4>
                  <p>{appointment.specialist_specialty}</p>
                  
                  <div className="appointment-meta">
                    {appointment.is_virtual ? (
                      <div className="appointment-location virtual">
                        <Video size={14} />
                        <span>Virtual Session</span>
                      </div>
                    ) : (
                      <div className="appointment-location">
                        <MapPin size={14} />
                        <span>{appointment.location || 'In-person'}</span>
                      </div>
                    )}
                    <div className="appointment-duration">
                      {appointment.duration_minutes} min
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="no-appointments">
            <Calendar size={48} />
            <h3>No appointments scheduled</h3>
            <p>Book an appointment with a specialist to get started</p>
            <button className="book-appointment-btn">
              Book Appointment
            </button>
          </div>
        )}
      </div>
    </BaseWidget>
  );
};

export default AppointmentsWidget;
