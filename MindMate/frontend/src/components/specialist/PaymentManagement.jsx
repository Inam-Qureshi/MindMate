import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  User,
  Calendar,
  RefreshCw,
  Loader
} from 'react-feather';
import apiClient from '../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../UI/Toast';
import { APIErrorHandler } from '../../utils/errorHandler';
import './PaymentManagement.css';

const PaymentManagement = ({ darkMode }) => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const toast = useToast();

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(API_ENDPOINTS.APPOINTMENTS.PENDING_PAYMENTS);
      
      if (response.data && response.data.pending_payments) {
        setPendingPayments(response.data.pending_payments || []);
      } else {
        setPendingPayments([]);
      }
    } catch (err) {
      console.error('Error loading pending payments:', err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'payment');
      setError(errorInfo.message);
      toast.error(errorInfo.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleConfirmPayment = useCallback(async (appointmentId) => {
    try {
      setProcessing(true);
      
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.CONFIRM_PAYMENT(appointmentId)
      );

      if (response.data && response.data.success) {
        toast.success('Payment confirmed and appointment approved');
        setShowConfirmModal(false);
        setSelectedPayment(null);
        loadPendingPayments();
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'payment');
      toast.error(errorInfo.message);
    } finally {
      setProcessing(false);
    }
  }, [toast, loadPendingPayments]);

  const handleRejectPayment = useCallback(async (appointmentId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.REJECT_PAYMENT(appointmentId),
        { reason: rejectionReason }
      );

      if (response.data && response.data.success) {
        toast.success('Payment rejected and appointment cancelled');
        setShowRejectModal(false);
        setSelectedPayment(null);
        setRejectionReason('');
        loadPendingPayments();
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'payment');
      toast.error(errorInfo.message);
    } finally {
      setProcessing(false);
    }
  }, [rejectionReason, toast, loadPendingPayments]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && pendingPayments.length === 0) {
    return (
      <div className={`payment-management ${darkMode ? 'dark' : ''}`}>
        <div className="loading-container">
          <Loader className="animate-spin" size={32} />
          <p>Loading pending payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`payment-management ${darkMode ? 'dark' : ''}`}>
      <div className="payment-header">
        <div className="header-content">
          <h2>
            <DollarSign size={24} />
            Pending Payment Confirmations
          </h2>
          <p>Review and confirm payments for online appointments</p>
        </div>
        <button
          onClick={loadPendingPayments}
          className="refresh-btn"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {pendingPayments.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} />
          <h3>No Pending Payments</h3>
          <p>All payments have been reviewed and confirmed.</p>
        </div>
      ) : (
        <div className="payments-list">
          {pendingPayments.map((payment) => (
            <motion.div
              key={payment.id}
              className="payment-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="payment-card-header">
                <div className="patient-info">
                  <User size={20} />
                  <div>
                    <h3>{payment.patient_name}</h3>
                    <p className="patient-id">ID: {payment.patient_id}</p>
                  </div>
                </div>
                <div className="payment-amount">
                  <DollarSign size={18} />
                  <span>Rs. {payment.fee?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <Calendar size={16} />
                  <span><strong>Date:</strong> {formatDate(payment.scheduled_start)}</span>
                </div>
                <div className="detail-row">
                  <Clock size={16} />
                  <span><strong>Time:</strong> {formatTime(payment.scheduled_start)} - {formatTime(payment.scheduled_end)}</span>
                </div>
                <div className="detail-row">
                  <DollarSign size={16} />
                  <span><strong>Payment Method:</strong> {payment.payment_method_id || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span><strong>Transaction ID:</strong> {payment.payment_receipt || 'N/A'}</span>
                </div>
              </div>

              {payment.presenting_concern && (
                <div className="concern-section">
                  <h4>Patient Concern:</h4>
                  <p>{payment.presenting_concern}</p>
                </div>
              )}

              {payment.request_message && (
                <div className="message-section">
                  <h4>Patient Notes:</h4>
                  <p>{payment.request_message}</p>
                </div>
              )}

              <div className="payment-actions">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedPayment(payment);
                    setShowConfirmModal(true);
                  }}
                  className="confirm-btn"
                >
                  <CheckCircle size={18} />
                  Confirm Payment
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedPayment(payment);
                    setShowRejectModal(true);
                  }}
                  className="reject-btn"
                >
                  <XCircle size={18} />
                  Reject Payment
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Confirm Payment</h3>
            <p>Are you sure you want to confirm this payment and approve the appointment?</p>
            <div className="modal-details">
              <p><strong>Patient:</strong> {selectedPayment.patient_name}</p>
              <p><strong>Amount:</strong> Rs. {selectedPayment.fee?.toFixed(2)}</p>
              <p><strong>Transaction ID:</strong> {selectedPayment.payment_receipt}</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="cancel-btn"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmPayment(selectedPayment.id)}
                className="confirm-btn"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {showRejectModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Reject Payment</h3>
            <p>Please provide a reason for rejecting this payment:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="rejection-input"
            />
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="cancel-btn"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectPayment(selectedPayment.id)}
                className="reject-btn"
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Reject
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;

