import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { ROUTES } from '../../../config/routes';

/**
 * Unified ProtectedRoute component for authentication and authorization
 * Replaces multiple implementations across the codebase
 * 
 * @param {ReactNode} children - Components to render if authenticated
 * @param {string[]} allowedRoles - Optional array of allowed user roles/types
 * @param {string[]} allowedUserTypes - Optional array of allowed user types (patient, specialist, admin)
 * @param {object} darkMode - Dark mode configuration (optional)
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  allowedUserTypes = [],
  darkMode = false 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Track last verified token to avoid repeated calls
  const tokenRef = useRef(null);
  const verifiedPathRef = useRef(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem("access_token");
        
        // Skip if token hasn't changed and we've already verified for this path
        const currentPath = location.pathname;
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Only verify if token changed or we haven't verified this path yet
        if (tokenRef.current === token && verifiedPathRef.current === currentPath && userData) {
          return; // Already verified, skip API call
        }

        tokenRef.current = token;
        verifiedPathRef.current = currentPath;

        // Verify token with backend
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const user = response.data;
        setUserData(user);
        setIsAuthenticated(true);
        
        // Check if account verification is pending
        if (user.verification_status === "pending") {
          navigate(ROUTES.OTP, { 
            state: { 
              email: user.email,
              fromLogin: true,
              userType: user.user_type || localStorage.getItem('user_type')
            },
            replace: true
          });
          return;
        }

        // Check user type restriction
        if (allowedUserTypes.length > 0) {
          const userType = user.user_type || localStorage.getItem('user_type');
          if (!allowedUserTypes.includes(userType)) {
            // Redirect based on user type using route constants
            const userTypeRoute = {
              'patient': ROUTES.DASHBOARD,
              'specialist': ROUTES.SPECIALIST_DASHBOARD,
              'admin': ROUTES.ADMIN_DASHBOARD
            };
            navigate(userTypeRoute[userType] || ROUTES.DASHBOARD, { replace: true });
            return;
          }
        }

        // Check role restriction (if needed)
        if (allowedRoles.length > 0 && user.role && !allowedRoles.includes(user.role)) {
          navigate(ROUTES.UNAUTHORIZED, { replace: true });
          return;
        }

      } catch (error) {
        console.error("Token verification error:", error);
        
        // If 401, clear tokens and redirect to login
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_id");
          localStorage.removeItem("user_type");
          tokenRef.current = null;
          verifiedPathRef.current = null;
        }
        
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
    // Only re-run when token changes, not on every pathname change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, allowedRoles.join(','), allowedUserTypes.join(',')]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`h-full flex items-center justify-center min-h-screen ${
          darkMode ? "bg-gray-900 text-gray-400" : "bg-gray-50 text-gray-600"
        }`}
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={ROUTES.LOGIN} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // All checks passed - render children
  return children;
};

export default ProtectedRoute;
