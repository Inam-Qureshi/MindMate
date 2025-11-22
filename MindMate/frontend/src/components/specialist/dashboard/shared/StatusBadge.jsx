import React from 'react';

const StatusBadge = ({ status, label }) => {
  const statusColors = {
    // Appointment statuses
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    completed: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    
    // Patient statuses
    new: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    follow_up: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    discharged: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    
    // Payment statuses
    paid: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    unpaid: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    
    // Slot statuses
    available: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    booked: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    blocked: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  };

  const colors = statusColors[status?.toLowerCase()] || statusColors.pending;
  const displayLabel = label || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;

