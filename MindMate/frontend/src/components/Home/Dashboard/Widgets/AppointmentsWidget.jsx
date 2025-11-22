import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, User, ChevronRight } from 'react-feather';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

const AppointmentsWidget = ({ appointments, darkMode, onViewAll, variant = 'default' }) => {
  const wrapperClasses =
    variant === 'minimal'
      ? `rounded-2xl border p-6 ${
          darkMode ? 'border-gray-800/70 bg-gray-900/70 text-gray-100' : 'border-slate-200 bg-white text-slate-900'
        }`
      : `rounded-2xl p-6 ${
          darkMode
            ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
            : 'bg-white shadow-lg border border-gray-100'
        }`;

  if (!appointments || appointments.length === 0) {
    return (
      <div className={wrapperClasses}>
        <h3
          className={`text-xl font-bold mb-4 ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}
        >
          Upcoming Appointments
        </h3>
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Calendar className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p>No upcoming appointments</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700',
      confirmed: darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
      cancelled: darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
      completed: darkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700',
    };
    return colors[status?.toLowerCase()] || colors.scheduled;
  };

  return (
    <div className={wrapperClasses}>
      <div className="flex items-center justify-between mb-6">
        <h3
          className={`text-xl font-bold ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}
        >
          Upcoming Appointments
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
          className={`text-sm font-medium transition-colors ${
            darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
          }`}
          >
            View All
          </button>
        )}
      </div>
      <div className="space-y-4">
        {appointments.slice(0, 3).map((appointment, index) => (
          <motion.div
            key={appointment.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
              variant === 'minimal'
                ? darkMode
                  ? 'border-gray-800/40 bg-gray-900/60 hover:border-gray-700'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                : darkMode
                ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span
                    className={`font-semibold ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}
                  >
                    {appointment.specialist_name || 'Specialist'}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                      appointment.status
                    )}`}
                  >
                    {appointment.status || 'scheduled'}
                  </span>
                </div>
                {appointment.specialist_specialty && (
                  <p
                    className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {appointment.specialist_specialty}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {formatDate(appointment.appointment_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {formatTime(appointment.appointment_date)}
                    </span>
                    {appointment.duration_minutes && (
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        ({appointment.duration_minutes} min)
                      </span>
                    )}
                  </div>
                  {appointment.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {appointment.location}
                      </span>
                    </div>
                  )}
                  {appointment.is_virtual && (
                    <div className="flex items-center gap-1">
                      <Video className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                        Virtual
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight
                className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentsWidget;

