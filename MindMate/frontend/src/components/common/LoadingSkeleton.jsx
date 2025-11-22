// components/LoadingSkeleton.jsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable skeleton loader component for better perceived performance
 */

const SkeletonPulse = ({ className = "", children }) => (
  <motion.div
    className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse ${className}`}
    initial={{ opacity: 0.5 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export const SkeletonText = ({ lines = 1, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonPulse key={i} className="h-4 rounded" />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <SkeletonPulse className={`rounded-full ${sizeClasses[size]} ${className}`} />
  );
};

export const SkeletonButton = ({ className = "" }) => (
  <SkeletonPulse className={`h-10 rounded-lg ${className}`} />
);

export const SkeletonCard = ({ className = "" }) => (
  <motion.div
    className={`p-6 rounded-xl border bg-white ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-3/4" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex space-x-2">
        <SkeletonButton className="w-20" />
        <SkeletonButton className="w-24" />
      </div>
    </div>
  </motion.div>
);

export const SpecialistCardSkeleton = ({ className = "" }) => (
  <SkeletonCard className={className}>
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-5 w-2/3" />
          <SkeletonPulse className="h-4 w-1/2" />
          <SkeletonPulse className="h-3 w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonText lines={1} />
        <SkeletonText lines={1} />
      </div>
      <div className="flex space-x-2">
        <SkeletonButton className="flex-1" />
        <SkeletonButton className="flex-1" />
      </div>
    </div>
  </SkeletonCard>
);

export const ForumCardSkeleton = ({ className = "" }) => (
  <SkeletonCard className={className}>
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <SkeletonAvatar size="sm" />
        <div className="flex-1 space-y-1">
          <SkeletonPulse className="h-4 w-1/3" />
          <SkeletonPulse className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center space-x-4">
        <SkeletonPulse className="h-3 w-12" />
        <SkeletonPulse className="h-3 w-16" />
        <SkeletonPulse className="h-3 w-14" />
      </div>
    </div>
  </SkeletonCard>
);

export const AppointmentCardSkeleton = ({ className = "" }) => (
  <SkeletonCard className={className}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SkeletonPulse className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <SkeletonPulse className="h-4 w-32" />
            <SkeletonPulse className="h-3 w-24" />
          </div>
        </div>
        <SkeletonPulse className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <SkeletonPulse className="h-3 w-16" />
          <SkeletonPulse className="h-4 w-28" />
        </div>
        <div className="space-y-2">
          <SkeletonPulse className="h-3 w-12" />
          <SkeletonPulse className="h-4 w-20" />
        </div>
      </div>
      <div className="flex space-x-2">
        <SkeletonButton className="flex-1" />
        <SkeletonButton className="flex-1" />
      </div>
    </div>
  </SkeletonCard>
);

export const TableSkeleton = ({ rows = 5, columns = 4, className = "" }) => (
  <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}>
    <div className="bg-gray-50 px-6 py-3">
      <div className="flex space-x-6">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonPulse key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4">
          <div className="flex space-x-6">
            {Array.from({ length: columns }).map((_, j) => (
              <SkeletonPulse key={j} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ProfileSkeleton = ({ className = "" }) => (
  <div className={`space-y-6 ${className}`}>
    <div className="flex items-center space-x-6">
      <SkeletonAvatar size="xl" />
      <div className="flex-1 space-y-3">
        <SkeletonPulse className="h-8 w-1/3" />
        <SkeletonPulse className="h-4 w-1/4" />
        <SkeletonPulse className="h-4 w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <SkeletonText lines={1} className="w-1/3" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-4">
        <SkeletonText lines={1} className="w-1/3" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
        <SkeletonPulse className="h-32 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

// Main loading skeleton component with different variants
const LoadingSkeleton = ({
  variant = "card",
  count = 3,
  className = ""
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case "specialist":
        return Array.from({ length: count }).map((_, i) => (
          <SpecialistCardSkeleton key={i} className={className} />
        ));
      case "forum":
        return Array.from({ length: count }).map((_, i) => (
          <ForumCardSkeleton key={i} className={className} />
        ));
      case "appointment":
        return Array.from({ length: count }).map((_, i) => (
          <AppointmentCardSkeleton key={i} className={className} />
        ));
      case "table":
        return <TableSkeleton rows={count} className={className} />;
      case "profile":
        return <ProfileSkeleton className={className} />;
      default:
        return Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} className={className} />
        ));
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {renderSkeleton()}
    </motion.div>
  );
};

export default LoadingSkeleton;
