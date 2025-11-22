import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ icon: Icon, title, message, actionButton }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {Icon && (
        <div className="mb-4 text-gray-400">
          <Icon size={64} />
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        {message}
      </p>
      {actionButton && (
        <div className="mt-4">
          {actionButton}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;

