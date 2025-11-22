import { motion } from 'framer-motion';
import { Heart, AlertTriangle, Moon, Activity, Users, TrendingUp } from 'react-feather';
import CountUp from 'react-countup';

const WellnessWidget = ({ data, darkMode, variant = 'default' }) => {
  if (!data) return null;

  const metrics = [
    {
      label: 'Mood',
      value: data.current_mood || 0,
      max: 10,
      icon: Heart,
      color: 'yellow',
      gradient: 'from-yellow-400 to-yellow-600',
    },
    {
      label: 'Stress Level',
      value: data.stress_level || 0,
      max: 10,
      icon: AlertTriangle,
      color: 'red',
      gradient: 'from-red-400 to-red-600',
      inverse: true,
    },
    {
      label: 'Energy',
      value: data.energy_level || 0,
      max: 10,
      icon: Activity,
      color: 'green',
      gradient: 'from-green-400 to-green-600',
    },
    {
      label: 'Sleep Quality',
      value: data.sleep_quality || 0,
      max: 10,
      icon: Moon,
      color: 'blue',
      gradient: 'from-blue-400 to-blue-600',
    },
    {
      label: 'Social Connections',
      value: data.social_connections || 0,
      max: 10,
      icon: Users,
      color: 'purple',
      gradient: 'from-purple-400 to-purple-600',
    },
  ];

  const colorClasses = {
    yellow: {
      icon: darkMode ? 'text-yellow-300' : 'text-yellow-600',
      background: darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
    },
    red: {
      icon: darkMode ? 'text-rose-300' : 'text-rose-600',
      background: darkMode ? 'bg-rose-500/10' : 'bg-rose-50',
    },
    green: {
      icon: darkMode ? 'text-emerald-300' : 'text-emerald-600',
      background: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
    },
    blue: {
      icon: darkMode ? 'text-blue-300' : 'text-blue-600',
      background: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
    },
    purple: {
      icon: darkMode ? 'text-purple-300' : 'text-purple-600',
      background: darkMode ? 'bg-purple-500/10' : 'bg-purple-50',
    },
  };

  const getWellnessScoreColor = (score) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

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

  const barBackground =
    variant === 'minimal'
      ? darkMode
        ? 'bg-gray-800/70'
        : 'bg-slate-200'
      : darkMode
      ? 'bg-gray-700'
      : 'bg-gray-200';

  return (
    <div className={wrapperClasses}>
      <h3
        className={`text-xl font-bold mb-6 ${
          darkMode ? 'text-gray-100' : 'text-gray-900'
        }`}
      >
        Wellness Metrics
      </h3>

      {/* Overall Wellness Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Overall Wellness Score
          </span>
          <span className={`text-3xl font-bold ${getWellnessScoreColor(data.wellness_score || 0)}`}>
            <CountUp end={data.wellness_score || 0} duration={2} decimals={1} />%
          </span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${barBackground}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.wellness_score || 0}%` }}
            transition={{ duration: 2, delay: 0.3 }}
            className={`h-full ${
              variant === 'minimal'
                ? data.wellness_score >= 70
                  ? darkMode
                    ? 'bg-emerald-500/80'
                    : 'bg-emerald-500'
                  : data.wellness_score >= 50
                  ? darkMode
                    ? 'bg-amber-400/80'
                    : 'bg-amber-400'
                  : darkMode
                  ? 'bg-rose-500/80'
                  : 'bg-rose-500'
                : data.wellness_score >= 70
                ? 'bg-gradient-to-r from-green-400 to-green-600'
                : data.wellness_score >= 50
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                : 'bg-gradient-to-r from-red-400 to-red-600'
            }`}
          />
        </div>
      </div>

      {/* Individual Metrics */}
      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const percentage = (metric.value / metric.max) * 100;
          const colorClasses = {
            yellow: darkMode ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-50',
            red: darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-50',
            green: darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-600 bg-green-50',
            blue: darkMode ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50',
            purple: darkMode ? 'text-purple-400 bg-purple-500/10' : 'text-purple-600 bg-purple-50',
          };

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${
                      variant === 'minimal'
                        ? `${darkMode ? 'border border-gray-800/50 bg-gray-900/60' : 'border border-slate-200 bg-slate-50'} ${
                            colorClasses[metric.color].icon
                          }`
                        : `${colorClasses[metric.color].icon} ${colorClasses[metric.color].background}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {metric.label}
                  </span>
                </div>
                <span className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  <CountUp end={metric.value} duration={2} decimals={1} />/{metric.max}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${barBackground}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.5, delay: index * 0.1 + 0.3 }}
                  className={`h-full ${
                    variant === 'minimal'
                      ? metric.color === 'red'
                        ? darkMode
                          ? 'bg-rose-500/80'
                          : 'bg-rose-500'
                        : metric.color === 'yellow'
                        ? darkMode
                          ? 'bg-amber-400/80'
                          : 'bg-amber-400'
                        : metric.color === 'green'
                        ? darkMode
                          ? 'bg-emerald-500/80'
                          : 'bg-emerald-500'
                        : metric.color === 'blue'
                        ? darkMode
                          ? 'bg-blue-400/80'
                          : 'bg-blue-500'
                        : darkMode
                        ? 'bg-purple-400/80'
                        : 'bg-purple-500'
                      : `bg-gradient-to-r ${metric.gradient}`
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mood Trend */}
      {data.mood_trend && data.mood_trend.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={`mt-6 rounded-xl p-4 ${
            variant === 'minimal'
              ? darkMode
                ? 'border border-sky-500/30 bg-sky-500/10'
                : 'border border-sky-200 bg-sky-50'
              : darkMode
              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20'
              : 'bg-gradient-to-r from-blue-50 to-purple-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Mood Trend
            </span>
          </div>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            {data.mood_trend.length > 0
              ? `Tracking over ${data.mood_trend.length} entries`
              : 'Start tracking your mood to see trends'}
          </p>
        </motion.div>
      )}

      {data.last_mood_entry && (
        <p className={`text-xs mt-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Last mood entry: {new Date(data.last_mood_entry).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default WellnessWidget;

