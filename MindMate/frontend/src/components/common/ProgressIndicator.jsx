// components/ProgressIndicator.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'react-feather';

/**
 * Progress indicators for long-running operations
 */

const ProgressStep = ({ step, currentStep, completedSteps, isLast }) => {
  const isCompleted = completedSteps.includes(step.id);
  const isCurrent = currentStep === step.id;
  const isPending = !isCompleted && !isCurrent;

  return (
    <div className="flex items-center">
      <div className="flex items-center">
        <motion.div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isCompleted
              ? 'bg-green-500 text-white'
              : isCurrent
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isCompleted ? (
            <CheckCircle size={16} />
          ) : isCurrent ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader size={16} />
            </motion.div>
          ) : (
            <span className="text-xs font-medium">{step.number}</span>
          )}
        </motion.div>
        {!isLast && (
          <motion.div
            className={`w-12 h-0.5 mx-2 ${
              isCompleted ? 'bg-green-500' : 'bg-gray-200'
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isCompleted ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </div>
      <div className="ml-3">
        <div className={`text-sm font-medium ${
          isCompleted ? 'text-green-600' :
          isCurrent ? 'text-blue-600' :
          'text-gray-400'
        }`}>
          {step.title}
        </div>
        {isCurrent && step.description && (
          <div className="text-xs text-gray-500 mt-1">
            {step.description}
          </div>
        )}
      </div>
    </div>
  );
};

export const StepProgress = ({
  steps,
  currentStep,
  completedSteps = [],
  className = ""
}) => (
  <div className={`py-4 ${className}`}>
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <ProgressStep
          key={step.id}
          step={{ ...step, number: index + 1 }}
          currentStep={currentStep}
          completedSteps={completedSteps}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  </div>
);

export const LinearProgress = ({
  progress,
  label,
  showPercentage = true,
  color = "blue",
  className = ""
}) => {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500"
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export const CircularProgress = ({
  progress,
  size = 60,
  strokeWidth = 4,
  color = "blue",
  showPercentage = true,
  label,
  className = ""
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    purple: "text-purple-500"
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={colorClasses[color]}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <div className="mt-2 text-center">
          <div className="text-sm font-medium text-gray-700">{label}</div>
        </div>
      )}
    </div>
  );
};

export const StatusIndicator = ({
  status,
  message,
  icon,
  color = "blue",
  className = ""
}) => {
  const statusConfig = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: CheckCircle,
      defaultColor: "text-green-600"
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: XCircle,
      defaultColor: "text-red-600"
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertCircle,
      defaultColor: "text-yellow-600"
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: AlertCircle,
      defaultColor: "text-blue-600"
    },
    loading: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-800",
      icon: Loader,
      defaultColor: "text-gray-600"
    }
  };

  const config = statusConfig[status] || statusConfig.info;
  const IconComponent = icon || config.icon;

  return (
    <motion.div
      className={`flex items-center p-4 rounded-lg border ${config.bg} ${config.border} ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <IconComponent
        className={`flex-shrink-0 w-5 h-5 mr-3 ${config.defaultColor}`}
        size={20}
      />
      <div className={`text-sm ${config.text}`}>
        {message}
      </div>
      {status === 'loading' && (
        <motion.div
          className="ml-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader className={`w-4 h-4 ${config.defaultColor}`} />
        </motion.div>
      )}
    </motion.div>
  );
};

export const ProgressModal = ({
  isOpen,
  title,
  steps,
  currentStep,
  completedSteps = [],
  onClose,
  className = ""
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`bg-white rounded-lg shadow-xl max-w-md w-full ${className}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>
            <StepProgress
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
            />
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Toast-style progress notification
export const ProgressToast = ({
  message,
  progress,
  onClose,
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  React.useEffect(() => {
    if (autoClose && progress === 100) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, progress, onClose, autoCloseDelay]);

  return (
    <motion.div
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-80 z-50"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
      <LinearProgress progress={progress} showPercentage={false} />
    </motion.div>
  );
};
