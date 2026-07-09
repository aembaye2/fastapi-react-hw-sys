import api from './api.js';

class QuizService {
  // Get all quizzes
  async getAllQuizzes() {
    try {
      const response = await api.get('/quizzes/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch quizzes'
      };
    }
  }

  // Get quiz by ID
  async getQuizById(quizId) {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch quiz'
      };
    }
  }

  // Get quiz questions
  async getQuizQuestions(quizId) {
    try {
      const response = await api.get(`/quizzes/${quizId}/questions`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch questions'
      };
    }
  }

  // Submit quiz attempt
  async submitQuizAttempt(quizId, answers) {
    try {
      const response = await api.post(`/quizzes/${quizId}/submit`, {
        quiz_id: quizId,
        answers: answers,
        time_taken: null // You can add time tracking later if needed
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Quiz submission error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to submit quiz'
      };
    }
  }

  // Get user's quiz attempts
  async getUserAttempts() {
    try {
      const response = await api.get('/attempts/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch attempts'
      };
    }
  }

  // Get specific attempt details
  async getAttemptById(attemptId) {
    try {
      const response = await api.get(`/attempts/${attemptId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch attempt'
      };
    }
  }

  // Admin: Create new quiz
  async createQuiz(quizData) {
    try {
      const response = await api.post('/admin/quizzes', quizData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create quiz'
      };
    }
  }

  // Admin: Update quiz
  async updateQuiz(quizId, quizData) {
    try {
      const response = await api.put(`/admin/quizzes/${quizId}`, quizData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update quiz'
      };
    }
  }

  // Admin: Delete quiz
  async deleteQuiz(quizId) {
    try {
      await api.delete(`/admin/quizzes/${quizId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete quiz'
      };
    }
  }

  // Get quiz results by attempt ID
  async getQuizResults(attemptId) {
    try {
      const response = await api.get(`/attempts/${attemptId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch results'
      };
    }
  }

  // Get all quizzes (wrapper for getAllQuizzes)
  async getQuizzes() {
    return this.getAllQuizzes();
  }
}

const quizService = new QuizService();
export default quizService;
export { quizService };
