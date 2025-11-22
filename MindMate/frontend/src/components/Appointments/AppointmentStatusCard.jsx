import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Star,
  Eye,
  Edit3,
  Trash2,
  Video,
  Phone,
  MapPin
} from 'react-feather';

const AppointmentStatusCard = ({ 
  appointment, 
  darkMode, 
  onViewDetails, 
  onEdit, 
  onCancel,
  onStartSession,
  onCompleteSession,
  onSubmitReview,
  userType = 'patient' // 'patient' or 'specialist'
}) => {
  const getStatusColor = (status) => {
    const colors = {
      pending_approval: darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800',
      approved: darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800',
      rejected: darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800',
      scheduled: darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800',
      confirmed: darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-800',
      in_session: darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800',
      completed: darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800',
      reviewed: darkMode ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800',
      cancelled: darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800',
      no_show: darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'
    };
    return colors[status] || colors.pending_approval;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending_approval: <AlertCircle className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      scheduled: <Calendar className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      in_session: <MessageCircle className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      reviewed: <Star className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
      no_show: <AlertCircle className="w-4 h-4" />
    };
    return icons[status] || icons.pending_approval;
  };

  const getStatusText = (status) => {
    const texts = {
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      in_session: 'In Session',
      completed: 'Completed',
      reviewed: 'Reviewed',
      cancelled: 'Cancelled',
      no_show: 'No Show'
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConsultationModeIcon = (mode) => {
    switch (mode) {
      case 'online':
        return <Video className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      case 'hybrid':
        return <Phone className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    if (userType === 'patient') {
      switch (appointment.status) {
        case 'pending_approval':
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          actions.push({ label: 'Cancel Request', action: 'cancel', icon: <XCircle className="w-4 h-4" /> });
          break;
        case 'approved':
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          actions.push({ label: 'Confirm Appointment', action: 'confirm', icon: <CheckCircle className="w-4 h-4" /> });
          break;
        case 'confirmed':
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          actions.push({ label: 'Join Session', action: 'join', icon: <MessageCircle className="w-4 h-4" /> });
          break;
        case 'in_session':
          actions.push({ label: 'Join Session', action: 'join', icon: <MessageCircle className="w-4 h-4" /> });
          break;
        case 'completed':
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          if (!appointment.patient_rating) {
            actions.push({ label: 'Submit Review', action: 'review', icon: <Star className="w-4 h-4" /> });
          }
          break;
        case 'rejected':
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          break;
      }
    } else if (userType === 'specialist') {
      switch (appointment.status) {
        case 'pending_approval':
          actions.push({ label: 'Approve', action: 'approve', icon: <CheckCircle className="w-4 h-4" /> });
          actions.push({ label: 'Reject', action: 'reject', icon: <XCircle className="w-4 h-4" /> });
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          break;
        case 'approved':
          actions.push({ label: 'Start Session', action: 'start_session', icon: <MessageCircle className="w-4 h-4" /> });
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          break;
        case 'in_session':
          actions.push({ label: 'End Session', action: 'end_session', icon: <CheckCircle className="w-4 h-4" /> });
          actions.push({ label: 'View Session', action: 'view_session', icon: <MessageCircle className="w-4 h-4" /> });
          break;
        case 'completed':
          actions.push({ label: 'View Details', action: 'view', icon: <Eye className="w-4 h-4" /> });
          if (appointment.patient_review) {
            actions.push({ label: 'View Review', action: 'view_review', icon: <Star className="w-4 h-4" /> });
          }
          break;
      }
    }
    
    return actions;
  };

  const handleAction = (action) => {
    switch (action) {
      case 'view':
        onViewDetails?.(appointment);
        break;
      case 'edit':
        onEdit?.(appointment);
        break;
      case 'cancel':
        onCancel?.(appointment);
        break;
      case 'approve':
        onEdit?.(appointment, 'approve');
        break;
      case 'reject':
        onEdit?.(appointment, 'reject');
        break;
      case 'confirm':
        onEdit?.(appointment, 'confirm');
        break;
      case 'start_session':
        onStartSession?.(appointment);
        break;
      case 'end_session':
        onCompleteSession?.(appointment);
        break;
      case 'join':
      case 'view_session':
        onViewDetails?.(appointment, 'session');
        break;
      case 'review':
        onSubmitReview?.(appointment);
        break;
      case 'view_review':
        onViewDetails?.(appointment, 'review');
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
        darkMode 
          ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            darkMode ? 'bg-blue-600' : 'bg-blue-100'
          }`}>
            <Calendar className={`w-5 h-5 ${
              darkMode ? 'text-blue-300' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className={`font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {userType === 'patient' ? appointment.specialist_name : appointment.patient_name}
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {userType === 'patient' ? appointment.specialist_type : 'Patient'}
            </p>
          </div>
        </div>
        
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
          {getStatusIcon(appointment.status)}
          <span>{getStatusText(appointment.status)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Presenting Concern */}
        {appointment.presenting_concern && (
          <div>
            <p className={`text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Presenting Concern:
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {appointment.presenting_concern.length > 100 
                ? `${appointment.presenting_concern.substring(0, 100)}...` 
                : appointment.presenting_concern
              }
            </p>
          </div>
        )}

        {/* Appointment Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {formatDate(appointment.scheduled_start)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {getConsultationModeIcon(appointment.consultation_mode)}
            <span className={`${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {appointment.consultation_mode?.replace('_', ' ') || 'Not specified'}
            </span>
          </div>
        </div>

        {/* Specialist Response (if any) */}
        {appointment.specialist_response && (
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <p className={`text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Specialist Response:
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {appointment.specialist_response}
            </p>
          </div>
        )}

        {/* Rejection Reason (if rejected) */}
        {appointment.status === 'rejected' && appointment.rejection_reason && (
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
          }`}>
            <p className={`text-sm font-medium mb-1 ${
              darkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              Rejection Reason:
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {appointment.rejection_reason}
            </p>
          </div>
        )}

        {/* Session Info (if in session or completed) */}
        {appointment.session_id && (
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-purple-900 bg-opacity-20' : 'bg-purple-50'
          }`}>
            <p className={`text-sm font-medium mb-1 ${
              darkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>
              Session Info:
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-purple-400' : 'text-purple-600'
            }`}>
              Session ID: {appointment.session_id}
              {appointment.session_started_at && (
                <span className="block mt-1">
                  Started: {formatDate(appointment.session_started_at)}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Review Info (if reviewed) */}
        {appointment.patient_rating && (
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'
          }`}>
            <div className="flex items-center space-x-2">
              <Star className={`w-4 h-4 ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <span className={`text-sm font-medium ${
                darkMode ? 'text-yellow-300' : 'text-yellow-700'
              }`}>
                Rating: {appointment.patient_rating}/5
              </span>
            </div>
            {appointment.patient_review && (
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                "{appointment.patient_review.substring(0, 100)}..."
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {getAvailableActions().length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          {getAvailableActions().map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action.action)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                action.action === 'approve' || action.action === 'start_session'
                  ? darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : action.action === 'reject' || action.action === 'cancel'
                  ? darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                  : darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AppointmentStatusCard;
