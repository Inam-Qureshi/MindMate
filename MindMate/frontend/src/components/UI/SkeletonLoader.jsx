/**
 * Skeleton Loader Components
 * ========================
 * Reusable skeleton loading components for better UX
 */

import React from 'react';
import { motion } from 'framer-motion';
import './SkeletonLoader.css';

/**
 * Base skeleton component with shimmer animation
 */
const SkeletonBase = ({ className = '', children, ...props }) => (
  <motion.div
    className={`skeleton ${className}`}
    animate={{
      opacity: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * Specialist card skeleton
 */
export const SpecialistCardSkeleton = () => (
  <div className="specialist-card-skeleton">
    <div className="skeleton-header">
      <SkeletonBase className="skeleton-avatar" />
      <div className="skeleton-info">
        <SkeletonBase className="skeleton-name" />
        <SkeletonBase className="skeleton-specialty" />
        <SkeletonBase className="skeleton-location" />
      </div>
    </div>
    
    <div className="skeleton-stats">
      <SkeletonBase className="skeleton-stat" />
      <SkeletonBase className="skeleton-stat" />
      <SkeletonBase className="skeleton-stat" />
    </div>
    
    <div className="skeleton-actions">
      <SkeletonBase className="skeleton-button" />
      <SkeletonBase className="skeleton-button" />
    </div>
  </div>
);

/**
 * Appointment card skeleton
 */
export const AppointmentCardSkeleton = () => (
  <div className="appointment-card-skeleton">
    <div className="skeleton-header">
      <SkeletonBase className="skeleton-avatar" />
      <div className="skeleton-info">
        <SkeletonBase className="skeleton-name" />
        <SkeletonBase className="skeleton-specialty" />
        <SkeletonBase className="skeleton-date" />
      </div>
    </div>
    
    <div className="skeleton-details">
      <SkeletonBase className="skeleton-detail" />
      <SkeletonBase className="skeleton-detail" />
      <SkeletonBase className="skeleton-detail" />
    </div>
    
    <div className="skeleton-actions">
      <SkeletonBase className="skeleton-button" />
      <SkeletonBase className="skeleton-button" />
    </div>
  </div>
);

/**
 * Time slot skeleton
 */
export const TimeSlotSkeleton = () => (
  <div className="time-slot-skeleton">
    <SkeletonBase className="skeleton-time" />
    <SkeletonBase className="skeleton-status" />
  </div>
);

/**
 * Form field skeleton
 */
export const FormFieldSkeleton = ({ label = true, button = false }) => (
  <div className="form-field-skeleton">
    {label && <SkeletonBase className="skeleton-label" />}
    <SkeletonBase className={`skeleton-input ${button ? 'skeleton-button' : ''}`} />
  </div>
);

/**
 * List skeleton for multiple items
 */
export const ListSkeleton = ({ count = 3, ItemComponent, ...props }) => (
  <div className="list-skeleton">
    {Array.from({ length: count }).map((_, index) => (
      <ItemComponent key={index} {...props} />
    ))}
  </div>
);

/**
 * Grid skeleton for cards
 */
export const GridSkeleton = ({ 
  count = 6, 
  columns = 3, 
  ItemComponent = SpecialistCardSkeleton,
  ...props 
}) => (
  <div 
    className="grid-skeleton"
    style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '1rem'
    }}
  >
    {Array.from({ length: count }).map((_, index) => (
      <ItemComponent key={index} {...props} />
    ))}
  </div>
);

/**
 * Table skeleton
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="table-skeleton">
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonBase key={index} className="skeleton-header-cell" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="skeleton-table-row">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonBase key={colIndex} className="skeleton-table-cell" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Search bar skeleton
 */
export const SearchBarSkeleton = () => (
  <div className="search-bar-skeleton">
    <SkeletonBase className="skeleton-search-input" />
    <SkeletonBase className="skeleton-search-button" />
  </div>
);

/**
 * Filter panel skeleton
 */
export const FilterPanelSkeleton = () => (
  <div className="filter-panel-skeleton">
    <SkeletonBase className="skeleton-filter-title" />
    <div className="skeleton-filters">
      {Array.from({ length: 4 }).map((_, index) => (
        <FormFieldSkeleton key={index} />
      ))}
    </div>
    <div className="skeleton-filter-actions">
      <SkeletonBase className="skeleton-button" />
      <SkeletonBase className="skeleton-button" />
    </div>
  </div>
);

/**
 * Pagination skeleton
 */
export const PaginationSkeleton = () => (
  <div className="pagination-skeleton">
    <SkeletonBase className="skeleton-pagination-info" />
    <div className="skeleton-pagination-controls">
      <SkeletonBase className="skeleton-button" />
      <SkeletonBase className="skeleton-button" />
      <SkeletonBase className="skeleton-button" />
      <SkeletonBase className="skeleton-button" />
    </div>
  </div>
);

/**
 * Modal skeleton
 */
export const ModalSkeleton = () => (
  <div className="modal-skeleton">
    <div className="skeleton-modal-header">
      <SkeletonBase className="skeleton-modal-title" />
      <SkeletonBase className="skeleton-close-button" />
    </div>
    <div className="skeleton-modal-content">
      <FormFieldSkeleton />
      <FormFieldSkeleton />
      <FormFieldSkeleton />
      <SkeletonBase className="skeleton-button" />
    </div>
  </div>
);

export default SkeletonBase;
