import { motion } from "framer-motion";

const ProgressSummary = ({ darkMode }) => {
  // Sample data - replace with real data
  const stats = [
    { label: 'Mood Average', value: '7.2', change: '+0.5', positive: true },
    { label: 'Journal Entries', value: '14', change: '+3', positive: true },
    { label: 'Exercises Completed', value: '5', change: '-1', positive: false }
  ];

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
      <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <motion.div 
            key={index}
            whileHover={{ x: 5 }}
            className="flex justify-between items-center"
          >
            <span>{stat.label}</span>
            <div className="flex items-center">
              <span className="font-bold mr-2">{stat.value}</span>
              <span className={`text-sm ${stat.positive ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                {stat.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProgressSummary;