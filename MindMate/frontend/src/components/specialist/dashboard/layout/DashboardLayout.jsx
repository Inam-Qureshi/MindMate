import React from 'react';
import DashboardHeader from './DashboardHeader';
import './DashboardLayout.css';

const DashboardLayout = ({ 
  children, 
  darkMode, 
  onToggleDarkMode, 
  activeTab,
  onTabChange,
  specialistInfo,
  onLogout
}) => {
  return (
    <div className={`min-h-screen flex flex-col ${
      darkMode ? "bg-gray-900" : "bg-gray-50"
    }`}>
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        specialistInfo={specialistInfo}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

