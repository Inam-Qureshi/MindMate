import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  MessageSquare,
  Calendar,
  Heart,
  Target,
  Plus,
  Users,
  TrendingUp,
} from 'react-feather';
import { MoodAssessmentModal, JournalEntryModal, StartExerciseModal } from '../../../Modals';
import BookingWizard from '../../../Appointments/BookingWizard';

const QuickActionsWidget = ({
  actions,
  darkMode,
  onActionComplete,
  variant = 'default',
  showTitle = true,
  layout = 'stack',
  className = '',
  title = 'Quick Actions',
}) => {
  const navigate = useNavigate();
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showBookingWizard, setShowBookingWizard] = useState(false);

  // Map icon strings to React components
  const iconMap = {
    'activity': Activity,
    'book-open': BookOpen,
    'calendar': Calendar,
    'heart': Heart,
    'target': Target,
    'message-square': MessageSquare,
    'users': Users,
    'trending-up': TrendingUp,
    'plus': Plus,
  };

  const getIconComponent = (icon) => {
    if (typeof icon === 'string') {
      // If it's a string, look it up in the icon map
      return iconMap[icon.toLowerCase()] || Plus;
    }
    // If it's already a component, return it
    return icon || Plus;
  };

  const essentialActionIds = ['book_appointment', 'start_assessment', 'start_exercise'];

  const defaultActions = [
    {
      id: 'book_appointment',
      title: 'Book Appointment',
      description: 'Schedule a session with a specialist',
      icon: 'calendar',
      route: '/dashboard/appointments',
      color: 'purple',
      is_available: true,
    },
    {
      id: 'start_assessment',
      title: 'Start Assessment',
      description: 'Take a mental health assessment',
      icon: 'book-open',
      route: '/dashboard/assessment',
      color: 'green',
      is_available: true,
    },
    {
      id: 'start_exercise',
      title: 'Start Exercise',
      description: 'Begin a new exercise session',
      icon: 'activity',
      route: '/dashboard/exercises',
      color: 'blue',
      is_available: true,
    },
  ];

  const normalizedActions = essentialActionIds
    .map((id) => {
      const fallback = defaultActions.find((action) => action.id === id);
      const serverAction = actions?.find((action) => action.id === id);
      if (!fallback && !serverAction) {
        return null;
      }
      return {
        ...(fallback || {}),
        ...(serverAction || {}),
      };
    })
    .filter(Boolean);

  const displayActions =
    normalizedActions.length > 0
      ? normalizedActions
      : defaultActions;

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: darkMode ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-blue-50 hover:bg-blue-100',
        text: darkMode ? 'text-blue-400' : 'text-blue-600',
        border: darkMode ? 'border-blue-500/30' : 'border-blue-200',
      },
      purple: {
        bg: darkMode ? 'bg-purple-500/10 hover:bg-purple-500/20' : 'bg-purple-50 hover:bg-purple-100',
        text: darkMode ? 'text-purple-400' : 'text-purple-600',
        border: darkMode ? 'border-purple-500/30' : 'border-purple-200',
      },
      yellow: {
        bg: darkMode ? 'bg-yellow-500/10 hover:bg-yellow-500/20' : 'bg-yellow-50 hover:bg-yellow-100',
        text: darkMode ? 'text-yellow-400' : 'text-yellow-600',
        border: darkMode ? 'border-yellow-500/30' : 'border-yellow-200',
      },
      green: {
        bg: darkMode ? 'bg-green-500/10 hover:bg-green-500/20' : 'bg-green-50 hover:bg-green-100',
        text: darkMode ? 'text-green-400' : 'text-green-600',
        border: darkMode ? 'border-green-500/30' : 'border-green-200',
      },
      indigo: {
        bg: darkMode ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'bg-indigo-50 hover:bg-indigo-100',
        text: darkMode ? 'text-indigo-400' : 'text-indigo-600',
        border: darkMode ? 'border-indigo-500/30' : 'border-indigo-200',
      },
    };
    return colors[color] || colors.blue;
  };

  const handleActionClick = (action) => {
    if (action.is_available === false) {
      return;
    }

    // Handle actions based on action ID
    switch (action.id) {
      case 'book_appointment':
        setShowBookingWizard(true);
        break;
      case 'start_assessment':
        navigate('/assessment');
        break;
      case 'start_exercise':
        setShowExerciseModal(true);
        break;
      default:
        console.warn('Unknown action:', action.id);
    }
  };

  const handleBookingComplete = (appointment) => {
    if (onActionComplete) {
      onActionComplete('booking', appointment);
    }
    setShowBookingWizard(false);
  };

  const handleJournalComplete = (entry) => {
    if (onActionComplete) {
      onActionComplete('journal', entry);
    }
  };

  const handleExerciseComplete = (session) => {
    if (onActionComplete) {
      onActionComplete('exercise', session);
    }
  };

  const baseWrapperClasses =
    variant === 'inline'
      ? ''
      : variant === 'minimal'
      ? `rounded-2xl border p-6 ${
          darkMode ? 'border-gray-800/70 bg-gray-900/70 text-gray-100' : 'border-slate-200 bg-white text-slate-900'
        }`
      : `rounded-2xl p-6 ${
          darkMode
            ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
            : 'bg-white shadow-lg border border-gray-100'
        }`;

  const wrapperClasses = [baseWrapperClasses, className].filter(Boolean).join(' ').trim();

  const actionsLayoutClasses =
    layout === 'row'
      ? 'grid grid-cols-1 gap-3 md:grid-cols-3'
      : layout === 'row-tight'
      ? 'flex flex-col gap-3 md:flex-row md:gap-4'
      : 'grid grid-cols-1 gap-3';


  return (
    <div className={wrapperClasses}>
      {showTitle && (
        <h3
          className={`text-xl font-bold mb-6 ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}
        >
          {title}
        </h3>
      )}
      <div className={actionsLayoutClasses}>
        {displayActions.map((action, index) => {
          const Icon = getIconComponent(action.icon);
          const colors = getColorClasses(action.color || 'blue');
          const isDisabled = action.is_available === false;

          return (
            <motion.button
              key={action.id || index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleActionClick(action)}
              disabled={isDisabled}
              className={`w-full p-4 rounded-xl border-2 ${colors.bg} ${colors.border} ${colors.text} transition-all duration-200 text-left ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : variant === 'minimal'
                  ? 'cursor-pointer hover:border-current hover:bg-opacity-90'
                  : 'cursor-pointer hover:scale-105'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-left">
              <div className="font-semibold text-sm mb-1">{action.title}</div>
              {action.description && (
                <div
                  className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {action.description}
                </div>
              )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Modals */}
      {showBookingWizard && (
        <BookingWizard
          selectedSpecialist={null}
          onClose={() => setShowBookingWizard(false)}
          onBookingComplete={handleBookingComplete}
          darkMode={darkMode}
        />
      )}
      <JournalEntryModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        darkMode={darkMode}
        onComplete={handleJournalComplete}
      />
      <StartExerciseModal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        darkMode={darkMode}
        onComplete={handleExerciseComplete}
      />
    </div>
  );
};

export default QuickActionsWidget;

