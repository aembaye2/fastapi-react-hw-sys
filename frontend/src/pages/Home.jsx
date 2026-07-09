import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Award, Clock, CheckCircle, Target, Brain, TrendingUp, BarChart, Eye } from 'lucide-react'
import api from '../services/api'


const Home = () => {
  const [stats, setStats] = useState({
    totalQuizzes: 320, // Default value instead of 0
    websiteViews: 5837 // Default value instead of 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        // Using the dashboard endpoint to get stats
        const response = await api.get('/users/dashboard')
        if (response.data && response.data.totalQuizzes !== undefined) {
          setStats({
            totalQuizzes: response.data.totalQuizzes || 320,
            websiteViews: response.data.websiteViews || 5837
          })
        }
      } catch (error) {
        // If unauthorized, keep guest defaults. Otherwise log and keep defaults too.
        const status = error.response?.status
        if (status === 401 || status === 403) {
          console.warn('Guest access — keeping default public stats')
        } else {
          console.error('Failed to load stats:', error)
        }
        // Stats will remain at the default values set in useState
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section with Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-blue-600">QuizMaster</span> Platform
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Test your knowledge, track your progress, and enhance your learning with our comprehensive quiz platform
          </p>

          {/* Stats Display */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">Total Quizzes</p>
                <p className="text-2xl font-bold">{loading ? "..." : stats.totalQuizzes}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">Website Views</p>
                <p className="text-2xl font-bold">{loading ? "..." : stats.websiteViews.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Get Started Free
            </Link>
            <Link
              to="/quizzes"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition duration-200"
            >
              Browse Quizzes
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Why Choose QuizMaster?</h2>
          <p className="mt-4 text-xl text-gray-600">Powerful features to enhance your learning experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Diverse Quiz Library</h3>
            <p className="text-gray-600">
              Access a wide range of quizzes across various subjects and difficulty levels to challenge yourself.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <BarChart className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Detailed Analytics</h3>
            <p className="text-gray-600">
              Track your progress with comprehensive statistics, performance graphs, and improvement suggestions.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Personalized Learning</h3>
            <p className="text-gray-600">
              Get recommendations based on your performance and focus on areas that need improvement.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Time-Based Challenges</h3>
            <p className="text-gray-600">
              Test your knowledge under pressure with timed quizzes to improve recall speed and accuracy.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Community Learning</h3>
            <p className="text-gray-600">
              Compare your results with others and participate in community-created quiz challenges.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="p-3 bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Brain className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Cognitive Development</h3>
            <p className="text-gray-600">
              Enhance memory retention and critical thinking skills through regular quiz practice.
            </p>
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How to Use QuizMaster</h2>
            <p className="mt-4 text-xl text-gray-600">Get started in just a few simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">Sign Up</h3>
              <p className="text-gray-600">Create your free account to access all features</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">Browse Quizzes</h3>
              <p className="text-gray-600">Find quizzes that match your interests and skill level</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">Take Quizzes</h3>
              <p className="text-gray-600">Challenge yourself with various questions and topics</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold mb-4">4</div>
              <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">Monitor your performance and see your improvement over time</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Start Your Learning Journey
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
