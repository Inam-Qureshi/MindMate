/**
 * Forum API Client
 * ================
 * Centralized API client for forum operations with proper error handling
 */

import axios from 'axios';
import { APIErrorHandler } from './errorHandler';
import { API_URL, API_ENDPOINTS } from '../config/api';
import { AuthStorage } from './localStorage';
import { ROUTES } from '../config/routes';
import { refreshAuthToken } from './tokenRefresh';

class ForumAPI {
  constructor() {
    this.baseURL = API_URL;
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        const token = AuthStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            const success = await refreshAuthToken();
            if (success) {
              // Update the authorization header with new token
              const newToken = AuthStorage.getToken();
              if (newToken && error.config) {
                error.config.headers.Authorization = `Bearer ${newToken}`;
                // Retry the original request
                return axios.request(error.config);
              }
            }
            throw new Error("Token refresh failed");
          } catch (refreshError) {
            // refreshAuthToken already handles cleanup and redirect
            // Just reject the promise
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Questions API
  async getQuestions(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.FORUM.QUESTIONS}`, { params });
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getQuestions):', errorInfo.message);
      throw error;
    }
  }

  async getQuestion(questionId) {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.FORUM.QUESTION_GET(questionId)}`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getQuestion):', errorInfo.message);
      throw error;
    }
  }

  async createQuestion(questionData) {
    try {
      const response = await axios.post(`${this.baseURL}${API_ENDPOINTS.FORUM.QUESTIONS}`, {
        title: questionData.title,
        content: questionData.content,
        category: questionData.category,
        tags: questionData.tags,
        is_anonymous: questionData.is_anonymous,
        is_urgent: questionData.is_urgent
      });
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (createQuestion):', errorInfo.message);
      throw error;
    }
  }

  async updateQuestion(questionId, questionData) {
    try {
      const response = await axios.put(`${this.baseURL}${API_ENDPOINTS.FORUM.QUESTION_UPDATE(questionId)}`, questionData);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (updateQuestion):', errorInfo.message);
      throw error;
    }
  }

  async deleteQuestion(questionId) {
    try {
      const response = await axios.delete(`${this.baseURL}${API_ENDPOINTS.FORUM.QUESTION_DELETE(questionId)}`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (deleteQuestion):', errorInfo.message);
      throw error;
    }
  }

  // Answers API
  async getAnswers(questionId) {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.FORUM.ANSWERS_BY_QUESTION(questionId)}`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getAnswers):', errorInfo.message);
      throw error;
    }
  }

  async createAnswer(questionId, answerData) {
    try {
      const response = await axios.post(`${this.baseURL}${API_ENDPOINTS.FORUM.ANSWER_CREATE(questionId)}`, {
        content: answerData.content
      });
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (createAnswer):', errorInfo.message);
      throw error;
    }
  }

  async updateAnswer(answerId, answerData) {
    try {
      const response = await axios.put(`${this.baseURL}${API_ENDPOINTS.FORUM.ANSWER_UPDATE(answerId)}`, answerData);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (updateAnswer):', errorInfo.message);
      throw error;
    }
  }

  async deleteAnswer(answerId) {
    try {
      const response = await axios.delete(`${this.baseURL}${API_ENDPOINTS.FORUM.ANSWER_DELETE(answerId)}`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (deleteAnswer):', errorInfo.message);
      throw error;
    }
  }

  // Community API
  async getStats() {
    try {
      const response = await axios.get(`${this.baseURL}/api/forum/stats`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getStats):', errorInfo.message);
      throw error;
    }
  }

  async getTopContributors(limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/api/forum/top-contributors`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getTopContributors):', errorInfo.message);
      throw error;
    }
  }

  async getRecentActivity(limit = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/api/forum/recent-activity`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getRecentActivity):', errorInfo.message);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/forum/user/profile/${userId}`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (getUserProfile):', errorInfo.message);
      throw error;
    }
  }

  // Moderation API
  async performModerationAction(action, targetId, data = {}) {
    try {
      const response = await axios.post(`${this.baseURL}/api/forum/admin/moderation`, {
        action,
        target_id: targetId,
        data
      });
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (performModerationAction):', errorInfo.message);
      throw error;
    }
  }

  // Reports API
  async createReport(reportData) {
    try {
      const response = await axios.post(`${this.baseURL}/api/forum/reports`, reportData);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (createReport):', errorInfo.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/api/forum/health`);
      return response.data;
    } catch (error) {
      const errorInfo = APIErrorHandler.handleForumError(error);
      console.error('Forum API Error (healthCheck):', errorInfo.message);
      throw error;
    }
  }
}

// Create and export singleton instance
const forumAPI = new ForumAPI();
export default forumAPI;
