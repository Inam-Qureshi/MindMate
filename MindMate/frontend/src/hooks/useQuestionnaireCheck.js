import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';

/**
 * Hook to check if user has completed the initial questionnaire
 * Redirects to initial information page if not completed
 *
 * @param {boolean} enabled - Whether to enable the check (default: true)
 * @param {string} redirectTo - Custom redirect route (default: INITIAL_INFORMATION)
 */
export const useQuestionnaireCheck = (enabled = true, redirectTo = ROUTES.INITIAL_INFORMATION) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const questionnaireCompleted = localStorage.getItem('questionnaire_completed') === 'true';

    if (!questionnaireCompleted) {
      // Redirect to initial information page or custom route
      navigate(redirectTo, { replace: true });
      return;
    }
  }, [navigate, enabled, redirectTo]);
};

/**
 * Utility function to check if questionnaire is completed
 * @returns {boolean} true if questionnaire is completed
 */
export const isQuestionnaireCompleted = () => {
  return localStorage.getItem('questionnaire_completed') === 'true';
};

/**
 * Utility function to mark questionnaire as completed
 */
export const markQuestionnaireCompleted = () => {
  localStorage.setItem('questionnaire_completed', 'true');
};

/**
 * Utility function to reset questionnaire completion status
 * (useful for testing or admin purposes)
 */
export const resetQuestionnaireStatus = () => {
  localStorage.removeItem('questionnaire_completed');
};
