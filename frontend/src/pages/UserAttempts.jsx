import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Award, Eye, Filter } from 'lucide-react';
import { quizService } from '../services/quizService';
import toast from 'react-hot-toast';

const UserAttempts = () => {
  const [attempts, setAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState({}); // Store quiz details by ID
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, passed, failed
  const [scoreFilter, setScoreFilter] = useState(''); // filter by score percentage
  const [scoreFilterType, setScoreFilterType] = useState('above'); // above or below
  const [currentPage, setCurrentPage] = useState(1);
  const attemptsPerPage = 20;

  useEffect(() => {
    fetchUserAttempts();
  }, []);

  const fetchUserAttempts = async () => {
    try {
      const response = await quizService.getUserAttempts();
      if (response.success) {
        setAttempts(response.data);

        // Fetch quiz details for each unique quiz_id
        const uniqueQuizIds = [...new Set(response.data.map(attempt => attempt.quiz_id))];
        const quizPromises = uniqueQuizIds.map(async (quizId) => {
          const quizResult = await quizService.getQuizById(quizId);
          return { quizId, quiz: quizResult.success ? quizResult.data : null };
        });

        const quizResults = await Promise.all(quizPromises);
        const quizMap = {};
        quizResults.forEach(({ quizId, quiz }) => {
          if (quiz) {
            quizMap[quizId] = quiz;
          }
        });
        setQuizzes(quizMap);
      } else {
        toast.error('Failed to load attempts');
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
      toast.error('Failed to load attempts');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredAttempts = attempts.filter(attempt => {
    // Filter by pass/fail status
    if (filter === 'passed' && attempt.score < 60) return false;
    if (filter === 'failed' && attempt.score >= 60) return false;

    // Filter by score percentage
    if (scoreFilter) {
      const scoreValue = parseFloat(scoreFilter);
      if (scoreFilterType === 'above' && attempt.score <= scoreValue) return false;
      if (scoreFilterType === 'below' && attempt.score >= scoreValue) return false;
    }

    return true;
  });

  // Pagination logic
  const totalAttempts = filteredAttempts.length;
  const totalPages = Math.ceil(totalAttempts / attemptsPerPage);
  const paginatedAttempts = filteredAttempts.slice((currentPage - 1) * attemptsPerPage, currentPage * attemptsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Quiz Attempts</h1>
        <p className="text-gray-600 mt-2">Track your quiz performance and progress</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>

            {/* Status Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Attempts</option>
              <option value="passed">Passed (≥60%)</option>
              <option value="failed">Failed (&lt;60%)</option>
            </select>
          </div>

          {/* Score Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Score:</span>
            <select
              value={scoreFilterType}
              onChange={(e) => setScoreFilterType(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Enter %"
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">%</span>
            {scoreFilter && (
              <button
                onClick={() => setScoreFilter('')}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attempts List */}
      {filteredAttempts.length === 0 ? (
        <div className="text-center py-12">
          <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {attempts.length === 0 ? 'No quiz attempts yet' : 'No attempts match your filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {attempts.length === 0
              ? 'Take your first quiz to see your results here.'
              : 'Try adjusting your filters to see more results.'}
          </p>
          <Link
            to="/quizzes"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Browse Quizzes
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quiz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAttempts.map((attempt) => {
                  const quiz = quizzes[attempt.quiz_id];
                  return (
                    <tr key={attempt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {quiz ? (
                            <Link
                              to={`/quiz/${attempt.quiz_id}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {quiz.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">Quiz #{attempt.quiz_id}</span>
                          )}
                          {quiz && (
                            <div className="text-xs text-gray-500 mt-1">
                              {quiz.questions?.length || 0} questions • {quiz.difficulty || 'Medium'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(attempt.score)}`}>
                          {attempt.score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(attempt.time_taken)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/quiz/${attempt.quiz_id}/results/${attempt._id}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Results
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAttempts;
