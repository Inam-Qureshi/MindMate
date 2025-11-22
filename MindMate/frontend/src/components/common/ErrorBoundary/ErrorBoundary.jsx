import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'react-feather';
import { ROUTES } from '../../../config/routes';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to error tracking service (if available)
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    // Use window.location since we can't guarantee Router context
    window.location.href = ROUTES.HOME;
  };

  render() {
    if (this.state.hasError) {
      const { darkMode = false, showDetails = false } = this.props;
      
      return (
        <div className={`flex items-center justify-center min-h-screen transition-colors ${
          darkMode ? "bg-gray-900" : "bg-gray-50"
        }`}>
          <div className={`max-w-md w-full mx-4 p-8 rounded-xl shadow-2xl ${
            darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
          }`}>
            <div className="flex items-center justify-center mb-6">
              <div className={`p-4 rounded-full ${
                darkMode ? "bg-red-900/30" : "bg-red-100"
              }`}>
                <AlertTriangle className="text-red-600 dark:text-red-400" size={48} />
              </div>
            </div>
            
            <h1 className={`text-2xl font-bold text-center mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Something went wrong
            </h1>
            
            <p className={`text-center mb-6 ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}>
              We're sorry for the inconvenience. An unexpected error occurred.
            </p>

            {showDetails && this.state.error && (
              <div className={`mb-6 p-4 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}>
                <p className={`text-sm font-mono ${
                  darkMode ? "text-red-300" : "text-red-600"
                }`}>
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  darkMode
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                <Home size={18} />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export the class component directly since we're not using hooks anymore
export default ErrorBoundaryClass;

