import { motion } from 'framer-motion';
import { Zap, Target, TrendingUp, Award, CheckCircle } from 'react-feather';
import CountUp from 'react-countup';

const ProgressWidget = ({ data, darkMode, variant = 'default' }) => {
  if (!data) return null;

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

  const mutedText = darkMode ? 'text-gray-400' : 'text-slate-500';

  return (
    <div className={wrapperClasses}>
      <h3
        className={`text-xl font-bold mb-6 ${
          darkMode ? 'text-gray-100' : 'text-gray-900'
        }`}
      >
        Progress Overview
      </h3>

      {/* Streak Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Current Streak
            </span>
          </div>
          <span className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            <CountUp end={data.current_streak || 0} duration={2} /> days
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Longest streak: <strong>{data.longest_streak || 0} days</strong>
          </span>
        </div>
      </div>

      {/* Sessions Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className={`rounded-xl p-4 ${
            variant === 'minimal'
              ? darkMode
                ? 'border border-gray-800/50 bg-gray-900/60'
                : 'border border-slate-200 bg-slate-50'
              : darkMode
              ? 'bg-blue-500/10'
              : 'bg-blue-50'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${mutedText}`}>
            Total Sessions
          </div>
          <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            <CountUp end={data.total_sessions || 0} duration={2} />
          </div>
        </div>
        <div
          className={`rounded-xl p-4 ${
            variant === 'minimal'
              ? darkMode
                ? 'border border-gray-800/50 bg-gray-900/60'
                : 'border border-slate-200 bg-slate-50'
              : darkMode
              ? 'bg-green-500/10'
              : 'bg-green-50'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${mutedText}`}>
            This Week
          </div>
          <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            <CountUp end={data.sessions_this_week || 0} duration={2} />
          </div>
        </div>
        <div
          className={`rounded-xl p-4 ${
            variant === 'minimal'
              ? darkMode
                ? 'border border-gray-800/50 bg-gray-900/60'
                : 'border border-slate-200 bg-slate-50'
              : darkMode
              ? 'bg-purple-500/10'
              : 'bg-purple-50'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${mutedText}`}>
            This Month
          </div>
          <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
            <CountUp end={data.sessions_this_month || 0} duration={2} />
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Completion Rate
          </span>
          <span className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            <CountUp end={data.completion_rate || 0} duration={2} decimals={1} />%
          </span>
        </div>
        <div
          className={`h-3 overflow-hidden rounded-full ${
            variant === 'minimal'
              ? darkMode
                ? 'bg-gray-800/70'
                : 'bg-slate-200'
              : darkMode
              ? 'bg-gray-700'
              : 'bg-gray-200'
          }`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.completion_rate || 0}%` }}
            transition={{ duration: 2, delay: 0.3 }}
            className={`h-full ${
              variant === 'minimal'
                ? darkMode
                  ? 'bg-blue-400/80'
                  : 'bg-blue-500'
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
          />
        </div>
      </div>

      {/* Goals Progress */}
      {data.goals_progress && data.goals_progress.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
            <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Goals Progress
            </span>
          </div>
          <div className="space-y-3">
            {data.goals_progress.slice(0, 3).map((goal, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {goal.title || goal.name || 'Goal'}
                  </span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {goal.progress || 0}%
                  </span>
                </div>
                <div
                  className={`h-2 overflow-hidden rounded-full ${
                    variant === 'minimal'
                      ? darkMode
                        ? 'bg-gray-800/70'
                        : 'bg-slate-200'
                      : darkMode
                      ? 'bg-gray-700'
                      : 'bg-gray-200'
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress || 0}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {data.recent_achievements && data.recent_achievements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
            <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Recent Achievements
            </span>
          </div>
          <div className="space-y-2">
            {data.recent_achievements.slice(0, 3).map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  variant === 'minimal'
                    ? darkMode
                      ? 'border border-amber-500/30 bg-amber-500/10'
                      : 'border border-amber-200 bg-amber-50'
                    : darkMode
                    ? 'bg-yellow-500/10'
                    : 'bg-yellow-50'
                }`}
              >
                <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {achievement.title || achievement.name || 'Achievement'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {data.next_milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={`mt-6 rounded-xl p-4 ${
            variant === 'minimal'
              ? darkMode
                ? 'border border-fuchsia-500/30 bg-fuchsia-500/10'
                : 'border border-fuchsia-200 bg-fuchsia-50'
              : darkMode
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20'
              : 'bg-gradient-to-r from-purple-50 to-pink-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Next Milestone
            </span>
          </div>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            {data.next_milestone.title || data.next_milestone.description || 'Keep going!'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ProgressWidget;

