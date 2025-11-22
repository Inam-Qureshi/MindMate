// components/ConfirmationDialog.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check, X as XIcon } from 'react-feather';

/**
 * Reusable confirmation dialog for destructive actions
 */

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "red",
  onConfirm,
  onCancel,
  type = "warning", // warning, danger, info
  isLoading = false,
  className = ""
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onCancel]);

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    danger: {
      icon: AlertTriangle,
      iconColor: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    info: {
      icon: AlertTriangle,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    }
  };

  const config = typeConfig[type] || typeConfig.warning;
  const IconComponent = config.icon;

  const buttonColors = {
    red: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    blue: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    green: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    gray: "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500",
    orange: "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onCancel : undefined}
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <motion.div
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full ${className}`}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className={`flex items-center p-4 border-b ${config.borderColor} ${config.bgColor}`}>
                <IconComponent className={`w-6 h-6 mr-3 ${config.iconColor}`} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                  {title}
                </h3>
                {!isLoading && (
                  <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {message}
                </p>

                {/* Action Buttons */}
                <div className="flex space-x-3 justify-end">
                  <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                      buttonColors[confirmButtonColor] || buttonColors.red
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{confirmText}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Specialized confirmation dialogs for common actions
export const DeleteConfirmationDialog = ({
  isOpen,
  itemName,
  itemType = "item",
  onConfirm,
  onCancel,
  isLoading = false
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    title={`Delete ${itemType}`}
    message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
    confirmText="Delete"
    confirmButtonColor="red"
    type="danger"
    onConfirm={onConfirm}
    onCancel={onCancel}
    isLoading={isLoading}
  />
);

export const LogoutConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    title="Sign Out"
    message="Are you sure you want to sign out of your account?"
    confirmText="Sign Out"
    confirmButtonColor="gray"
    type="info"
    onConfirm={onConfirm}
    onCancel={onCancel}
    isLoading={isLoading}
  />
);

export const CancelAppointmentDialog = ({
  isOpen,
  appointmentTitle,
  onConfirm,
  onCancel,
  isLoading = false
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    title="Cancel Appointment"
    message={`Are you sure you want to cancel the appointment "${appointmentTitle}"? This action may not be reversible.`}
    confirmText="Cancel Appointment"
    confirmButtonColor="red"
    type="warning"
    onConfirm={onConfirm}
    onCancel={onCancel}
    isLoading={isLoading}
  />
);

export const DeleteAccountDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    title="Delete Account"
    message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost."
    confirmText="Delete Account"
    confirmButtonColor="red"
    type="danger"
    onConfirm={onConfirm}
    onCancel={onCancel}
    isLoading={isLoading}
  />
);

// Hook for managing confirmation dialog state
export const useConfirmationDialog = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);
  const [pendingAction, setPendingAction] = React.useState(null);

  const openDialog = React.useCallback((action) => {
    setPendingAction(() => action);
    setIsOpen(true);
  }, []);

  const closeDialog = React.useCallback(() => {
    setIsOpen(false);
    setPendingAction(null);
  }, []);

  const confirmAction = React.useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    closeDialog();
  }, [pendingAction, closeDialog]);

  return {
    isOpen,
    openDialog,
    closeDialog,
    confirmAction,
    pendingAction
  };
};

export default ConfirmationDialog;
