import { motion } from 'framer-motion';
import { TrendingUp, Activity, Award, Calendar, Zap } from 'react-feather';
import CountUp from 'react-countup';

const UserStatsWidget = ({ data, darkMode, variant = 'default' }) => {
  if (!data) return null;

  const stats = [
    {
      label: 'Total Sessions',
      value: data.total_sessions || 0,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
    },
    {
      label: 'Current Streak',
      value: data.current_streak || 0,
      icon: Zap,
      color: 'text-orange-500',
      bgColor: darkMode ? 'bg-orange-500/10' : 'bg-orange-50',
      suffix: ' days',
    },
    {
      label: 'Longest Streak',
      value: data.longest_streak || 0,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: darkMode ? 'bg-green-500/10' : 'bg-green-50',
      suffix: ' days',
    },
    {
      label: 'Achievements',
      value: data.achievements_unlocked || 0,
      icon: Award,
      color: 'text-yellow-500',
      bgColor: darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
    },
    {
      label: 'Goals Completed',
      value: `${data.completed_goals || 0} / ${data.total_goals || 0}`,
      icon: Calendar,
      color: 'text-indigo-500',
      bgColor: darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50',
    },
  ];

  const wrapperClasses =
    variant === 'minimal'
      ? `rounded-2xl border p-6 ${
          darkMode ? 'border-gray-800/70 bg-gray-900/70 text-gray-100' : 'border-slate-200 bg-white text-slate-900'
        }`
      : `rounded-2xl p-6 ${
          darkMode ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700' : 'bg-white shadow-lg border border-gray-100'
        }`;

  const statClasses = (bgColor) =>
    variant === 'minimal'
      ? `rounded-xl border p-4 transition-colors ${
          darkMode ? 'border-gray-800/40 bg-gray-900/50 hover:border-gray-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`
      : `p-4 rounded-xl ${bgColor} transition-all duration-300 hover:scale-105`;

  const valueTextClass = variant === 'minimal'
    ? darkMode
      ? 'text-gray-100'
      : 'text-slate-900'
    : darkMode
    ? 'text-gray-100'
    : 'text-gray-900';

  const labelTextClass = variant === 'minimal'
    ? darkMode
      ? 'text-gray-400'
      : 'text-slate-500'
    : darkMode
    ? 'text-gray-400'
    : 'text-gray-600';

  return (
    <div className={wrapperClasses}>
      <h3
        className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-slate-900'} ${
          variant === 'minimal' ? 'mb-4' : 'mb-6'
        }`}
      >
        Your Statistics
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={statClasses(stat.bgColor)}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className={`h-5 w-5 ${variant === 'minimal' ? labelTextClass : stat.color}`} />
              </div>
              <div className={`text-2xl font-semibold ${variant === 'minimal' ? 'tracking-tight' : ''}`}>
                {typeof stat.value === 'number' && !stat.suffix ? (
                  <CountUp end={stat.value} duration={1.6} separator="," className={valueTextClass} />
                ) : (
                  <span className={valueTextClass}>{stat.value}</span>
                )}
                {stat.suffix && (
                  <span className={`ml-1 text-sm ${labelTextClass}`}>
                    {stat.suffix}
                  </span>
                )}
              </div>
              <p className={`mt-1 text-sm font-medium ${labelTextClass}`}>{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default UserStatsWidget;
