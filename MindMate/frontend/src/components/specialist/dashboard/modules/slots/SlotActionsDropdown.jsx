import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Lock, Unlock, Edit, Trash2 } from 'react-feather';
import apiClient from '../../../../../utils/axiosConfig';

const SlotActionsDropdown = ({ slot, darkMode, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBlockSlot = async () => {
    if (!blockReason.trim()) {
      setError('Please provide a reason for blocking this slot');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use PUT /specialists/slots/{slot_id} with status "blocked"
      await apiClient.put(
        `/api/specialists/slots/${slot.id}`,
        {
          status: 'blocked'
        }
      );

      setShowBlockModal(false);
      setBlockReason('');
      setIsOpen(false);
      onSuccess && onSuccess();
    } catch (err) {
      console.error('Error blocking slot:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to block slot');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockSlot = async () => {
    setLoading(true);
    setError('');

    try {
      // Use PUT /specialists/slots/{slot_id} with status "available"
      await apiClient.put(
        `/api/specialists/slots/${slot.id}`,
        {
          status: 'available'
        }
      );

      setIsOpen(false);
      onSuccess && onSuccess();
    } catch (err) {
      console.error('Error unblocking slot:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to unblock slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!window.confirm('Are you sure you want to delete this slot? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use DELETE /specialists/slots/{slot_id}
      await apiClient.delete(`/api/specialists/slots/${slot.id}`);

      setIsOpen(false);
      onSuccess && onSuccess();
    } catch (err) {
      console.error('Error deleting slot:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete slot');
      if (err.response?.status === 400) {
        alert(err.response?.data?.detail || err.response?.data?.message || 'Cannot delete booked slot');
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine slot status from the slot object
  // Backend returns: status (string: "available", "blocked", "booked", etc.)
  const slotStatus = slot.status || (slot.can_be_booked === false ? 'blocked' : 'available');
  const isBlocked = slotStatus === 'blocked';
  const isBooked = slotStatus === 'booked';

  return (
    <div className="relative">
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`p-2 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}
            >
              <div className="py-1">
                {/* Block/Unblock */}
                {!isBooked && (
                  <button
                    onClick={() => {
                      if (isBlocked) {
                        handleUnblockSlot();
                      } else {
                        setShowBlockModal(true);
                        setIsOpen(false);
                      }
                    }}
                    disabled={loading}
                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isBlocked ? (
                      <>
                        <Unlock className="h-4 w-4 text-green-500" />
                        <span>Unblock Slot</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-orange-500" />
                        <span>Block Slot</span>
                      </>
                    )}
                  </button>
                )}

                {/* Edit (Future) */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Implement edit functionality
                  }}
                  disabled={isBooked || loading}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  } ${isBooked || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Edit className="h-4 w-4 text-blue-500" />
                  <span>Edit Slot</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleDeleteSlot();
                  }}
                  disabled={isBooked || loading}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  } ${isBooked || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span>Delete Slot</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Block Reason Modal */}
      <AnimatePresence>
        {showBlockModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setShowBlockModal(false)}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative w-full max-w-md rounded-xl shadow-2xl p-6 ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Block Time Slot</h3>
                
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 text-sm">
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Reason for blocking *
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => {
                      setBlockReason(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g., Personal appointment, Meeting, Out of office..."
                    rows={3}
                    disabled={loading}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBlockModal(false);
                      setBlockReason('');
                      setError('');
                    }}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBlockSlot}
                    disabled={loading || !blockReason.trim()}
                    className={`px-4 py-2 rounded-lg text-white ${
                      loading || !blockReason.trim()
                        ? 'bg-orange-400 cursor-not-allowed'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {loading ? 'Blocking...' : 'Block Slot'}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SlotActionsDropdown;

