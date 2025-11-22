import React, { useState, useEffect } from 'react';
import ProfileViewPage from './ProfileViewPage';
import ProfileEditPage from './ProfileEditPage';
import ProfileDocumentsPage from './ProfileDocumentsPage';

const ProfileModule = ({ darkMode, activeSidebarItem = 'view' }) => {
  // Map activeSidebarItem to page state
  const getPageFromSidebarItem = (item) => {
    if (item === 'edit') return 'edit';
    if (item === 'documents') return 'documents';
    return 'view';
  };

  // Page state: 'view', 'edit', 'documents'
  const [currentPage, setCurrentPage] = useState(getPageFromSidebarItem(activeSidebarItem));

  // Sync with activeSidebarItem changes from parent
  useEffect(() => {
    setCurrentPage(getPageFromSidebarItem(activeSidebarItem));
  }, [activeSidebarItem]);

  const handleNavigateToEdit = () => {
    setCurrentPage('edit');
  };

  const handleNavigateToView = () => {
    setCurrentPage('view');
  };

  const handleNavigateToDocuments = () => {
    setCurrentPage('documents');
  };

  const handleProfileSave = () => {
    // After saving, optionally navigate back to view
    // setCurrentPage('view');
  };

  // Render appropriate page based on current state
  switch (currentPage) {
    case 'edit':
      return (
        <ProfileEditPage
          darkMode={darkMode}
          onNavigateToView={handleNavigateToView}
          onSave={handleProfileSave}
        />
      );
    case 'documents':
      return (
        <ProfileDocumentsPage
          darkMode={darkMode}
          onNavigateToView={handleNavigateToView}
        />
      );
    case 'view':
    default:
      return (
        <ProfileViewPage
          darkMode={darkMode}
          onNavigateToEdit={handleNavigateToEdit}
          onNavigateToDocuments={handleNavigateToDocuments}
        />
      );
  }
};

export default ProfileModule;

