import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  AlertCircle,
  FileText
} from 'react-feather';

const DashboardSidebar = ({ 
  darkMode, 
  activeTab, 
  activeSidebarItem, 
  onSidebarItemClick 
}) => {
  const [hovered, setHovered] = useState(false);

  const getSidebarContent = () => {
    switch (activeTab) {
      case "overview":
        return [
          { id: "dashboard", icon: BarChart, label: "Dashboard" },
          { id: "stats", icon: BarChart, label: "Statistics" },
          { id: "recent", icon: Clock, label: "Recent Activity" },
        ];
      case "appointments":
        return [
          { id: "all", icon: Calendar, label: "All Appointments" },
          { id: "pending", icon: Clock, label: "Pending" },
          { id: "scheduled", icon: CheckCircle, label: "Scheduled" },
          { id: "completed", icon: CheckCircle, label: "Completed" },
          { id: "cancelled", icon: XCircle, label: "Cancelled" },
        ];
      case "patients":
        return [
          { id: "all", icon: User, label: "All Patients" },
          { id: "new", icon: User, label: "New Patients" },
          { id: "active", icon: CheckCircle, label: "Active" },
          { id: "follow_up", icon: Clock, label: "Follow-up" },
          { id: "discharged", icon: XCircle, label: "Discharged" },
        ];
      case "forum":
        return [
          { id: "questions", icon: MessageSquare, label: "All Questions" },
          { id: "my_answers", icon: MessageSquare, label: "My Answers" },
          { id: "moderation", icon: AlertCircle, label: "Moderation" },
          { id: "stats", icon: BarChart, label: "Statistics" },
        ];
      case "slots":
        return [
          { id: "schedule", icon: Calendar, label: "Weekly Schedule" },
          { id: "generate", icon: Clock, label: "Generate Slots" },
          { id: "manage", icon: FileText, label: "Manage Slots" },
          { id: "summary", icon: BarChart, label: "Summary" },
        ];
      case "profile":
        return [
          { id: "view", icon: User, label: "View Profile" },
          { id: "edit", icon: FileText, label: "Edit Profile" },
          { id: "documents", icon: FileText, label: "Documents" },
          { id: "reviews", icon: BarChart, label: "Reviews" },
        ];
      default:
        return [];
    }
  };

  const sidebarItems = getSidebarContent();

  if (sidebarItems.length === 0) {
    return null;
  }

  return (
    <motion.aside
      className={`${
        darkMode ? "bg-gray-800" : "bg-white"
      } border-r transition-all duration-300 ease-in-out ${
        darkMode ? "border-gray-700" : "border-gray-200"
      }`}
      style={{ width: hovered ? 240 : 72 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={false}
      animate={{ width: hovered ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
    >
      <div className="p-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => onSidebarItemClick(item.id)}
              className={`mb-2 flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                activeSidebarItem === item.id
                  ? darkMode
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-900"
                  : darkMode
                  ? "text-gray-400 hover:bg-gray-700 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <div className="flex-shrink-0">
                <Icon size={20} />
              </div>
              {hovered && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-3 text-sm font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;

