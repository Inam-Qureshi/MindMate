import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, FileText, MessageSquare } from 'react-feather';

const StatsCards = ({ stats, darkMode }) => {
  const cards = [
    {
      title: "Today's Appointments",
      value: stats?.todays_appointments || 0,
      icon: Calendar,
      color: 'emerald'
    },
    {
      title: "Active Patients",
      value: stats?.active_patients || 0,
      icon: Users,
      color: 'blue'
    },
    {
      title: "Pending Reviews",
      value: stats?.pending_reviews || 0,
      icon: FileText,
      color: 'yellow'
    },
    {
      title: "Forum Answers",
      value: stats?.forum_answers || 0,
      icon: MessageSquare,
      color: 'purple'
    }
  ];

  const colorMap = {
    emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50', darkBg: 'bg-emerald-900/20' },
    blue: { icon: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
    yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-50', darkBg: 'bg-yellow-900/20' },
    purple: { icon: 'text-purple-500', bg: 'bg-purple-50', darkBg: 'bg-purple-900/20' }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const colors = colorMap[card.color];
        
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-xl shadow-lg ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {card.title}
                </p>
                <p className={`text-2xl font-bold mt-2 ${colors.icon}`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? colors.darkBg : colors.bg}`}>
                <Icon className={`h-6 w-6 ${colors.icon}`} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsCards;

