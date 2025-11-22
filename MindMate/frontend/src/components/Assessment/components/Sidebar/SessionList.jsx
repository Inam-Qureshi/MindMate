import React from 'react';
import SessionItem from './SessionItem';
import './SessionList.css';

const SessionList = ({
  sessions = [],
  currentSession,
  onSelectSession,
  onDeleteSession,
  darkMode
}) => {
  // Group sessions by date
  const groupSessionsByDate = (sessionsList) => {
    if (!sessionsList || !Array.isArray(sessionsList)) {
      return {};
    }

    const groups = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    sessionsList.forEach(session => {
      const dateString = session.created_at || session.startedAt;
      const sessionDate = new Date(dateString);
      
      if (isNaN(sessionDate.getTime())) {
        return;
      }
      
      const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
      
      let groupKey;
      if (sessionDateOnly.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (sessionDateOnly.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = sessionDateOnly.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });

    return groups;
  };

  const groupedSessions = groupSessionsByDate(sessions || []);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>No assessment sessions yet</p>
        <p className="empty-hint">Start a new assessment to begin</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {Object.entries(groupedSessions).map(([dateGroup, groupSessions]) => (
        <div key={dateGroup} className="session-group">
          <div className="session-group-header">
            {dateGroup}
          </div>
          {groupSessions.map((session) => (
            <SessionItem
              key={session.id || session.session_id}
              session={session}
              isActive={(currentSession?.id || currentSession?.session_id) === (session.id || session.session_id)}
              onSelect={() => onSelectSession(session.id || session.session_id)}
              onDelete={() => onDeleteSession(session.id || session.session_id)}
              darkMode={darkMode}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SessionList;

