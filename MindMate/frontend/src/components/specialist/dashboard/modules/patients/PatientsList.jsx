import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar } from 'react-feather';
import StatusBadge from '../../shared/StatusBadge';

const PatientsList = ({ patients, darkMode, pagination, onPageChange }) => {
  return (
    <div>
      {/* Table */}
      <div className={`rounded-xl shadow-lg overflow-hidden ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Patient
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Last Session
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Total Sessions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {patients.map((patient, index) => (
                <motion.tr 
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className={`text-sm flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Mail size={14} className="mr-1" />
                        {patient.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={patient.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {patient.last_session_date ? (
                        <>
                          <Calendar size={14} className="mr-1" />
                          {new Date(patient.last_session_date).toLocaleDateString()}
                        </>
                      ) : (
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Never</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {patient.total_sessions || 0}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 0 && pagination.size > 0 && pagination.total > pagination.size && (
        <div className="mt-4 flex items-center justify-between">
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {((pagination.page - 1) * pagination.size) + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total} patients
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`px-4 py-2 rounded-lg transition-colors ${
                pagination.page <= 1
                  ? darkMode
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                  : darkMode
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.has_more && (pagination.page * pagination.size >= pagination.total)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                (!pagination.has_more && pagination.page * pagination.size >= pagination.total)
                  ? darkMode
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                  : darkMode
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsList;

