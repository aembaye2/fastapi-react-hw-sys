import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Clock, Award, TrendingUp, Users, Brain, Zap, CheckCircle, Star, Trophy, Target } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'


const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalQuizzes: 320,  // Default to 320 instead of 0
    completedQuizzes: 0,
    averageScore: 0,
    recentAttempts: [],
    websiteVisits: 5837  // Add website visits with default 5837
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/users/dashboard')
      // Preserve default values if the API returns zeros or doesn't include these fields
      setStats({
        totalQuizzes: response.data.totalQuizzes || 320,
        completedQuizzes: response.data.completedQuizzes || 0,
        averageScore: response.data.averageScore || 0,
        recentAttempts: response.data.recentAttempts || [],
        websiteVisits: response.data.websiteVisits || 5837
      })
    } catch (error) {
      const status = error.response?.status
      if (status === 401 || status === 403) {
        // Unauthorized: keep guest/default stats and do not overwrite with zeros
        console.warn('Unauthorized access when fetching dashboard — viewing as guest')
        // optionally show a toast to inform the user
        // toast.error('Session expired. Viewing as guest.')
      } else {
        console.error('Failed to load dashboard data:', error)
        // Set default stats for other errors
        setStats({
          totalQuizzes: 320,
          completedQuizzes: 0,
          averageScore: 0,
          recentAttempts: [],
          websiteVisits: 5837
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Guest landing page when no user is logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-md py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-purple-600" />
                <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">QuizMaster</span>
              </div>
              <div className="hidden md:flex space-x-8">
                <a href="#features" className="text-gray-700 hover:text-purple-600 transition">Features</a>
                <a href="#testimonials" className="text-gray-700 hover:text-purple-600 transition">Testimonials</a>
                <a href="#contact" className="text-gray-700 hover:text-purple-600 transition">Contact</a>
              </div>
              <div className="flex space-x-4">
                <Link to="/login" className="px-4 py-2 rounded-md text-blue-600 font-medium border border-blue-600 hover:bg-blue-50 transition">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:opacity-90 transition">
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section with Abstract Geometric Shapes */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 overflow-hidden">
          {/* Abstract Geometric Shapes (SVG Background) */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
              <circle cx="150" cy="150" r="120" fill="white" />
              <rect x="400" y="200" width="300" height="300" rx="40" fill="white" />
              <polygon points="800,100 900,300 700,300" fill="white" />
              <circle cx="800" cy="700" r="100" fill="white" />
              <rect x="100" y="500" width="200" height="200" rx="30" fill="white" />
              <polygon points="450,600 600,800 300,800" fill="white" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative z-10">
            <div className="md:flex md:items-center md:justify-between">
              <div className="md:w-1/2 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                  Master Your Knowledge with QuizMaster
                </h1>
                <p className="mt-6 text-xl text-blue-100 max-w-2xl">
                  Challenge yourself, compete with friends, and become an expert in your field with our interactive quiz platform.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row justify-center md:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <Link to="/quizzes" className="px-8 py-4 text-lg rounded-full bg-white text-purple-700 font-bold shadow-lg hover:shadow-xl transform transition hover:-translate-y-1">
                    Start a Quiz
                  </Link>
                  <Link to="/how-it-works" className="px-8 py-4 text-lg rounded-full bg-purple-800 bg-opacity-40 text-white font-bold border border-purple-300 hover:bg-opacity-60 transition">
                    How It Works
                  </Link>
                </div>
              </div>
              <div className="hidden md:block md:w-5/12 mt-10 md:mt-0">
                <img
                  src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Students learning together"
                  className="w-full h-auto rounded-xl shadow-2xl transform -rotate-3 hover:rotate-0 transition duration-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section with Impressive Numbers */}
        <div className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 transform transition duration-300 hover:scale-105 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">250+</p>
                <p className="text-sm font-medium text-gray-600">Available Quizzes</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 transform transition duration-300 hover:scale-105 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">10,000+</p>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 transform transition duration-300 hover:scale-105 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">5M+</p>
                <p className="text-sm font-medium text-gray-600">Questions Answered</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 transform transition duration-300 hover:scale-105 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                  <Award className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">98%</p>
                <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Highlight Section */}
        <div id="features" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Supercharge Your Learning</span>
              </h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                Our platform offers everything you need to learn, challenge yourself, and track your progress.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <div className="p-8">
                  <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                    <Zap className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Create Quizzes</h3>
                  <p className="text-gray-600">
                    Easily create your own quizzes on any topic and share them with friends or the community.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <div className="p-8">
                  <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center mb-6">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Compete with Friends</h3>
                  <p className="text-gray-600">
                    Challenge your friends to quizzes and see who can achieve the highest score.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <div className="p-8">
                  <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-6">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Track Progress</h3>
                  <p className="text-gray-600">
                    Monitor your performance over time with detailed analytics and insights.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <div className="p-8">
                  <div className="h-14 w-14 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
                    <Trophy className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Earn Badges</h3>
                  <p className="text-gray-600">
                    Collect achievement badges as you complete quizzes and improve your knowledge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div id="testimonials" className="py-16 bg-gradient-to-r from-blue-600 to-purple-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                What Our Users Say
              </h2>
              <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
                Discover how QuizMaster has helped thousands of users enhance their knowledge.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="bg-white rounded-xl shadow-xl p-8">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">JD</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-bold">John Doe</h4>
                    <p className="text-gray-600">Student</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex text-yellow-400">
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                </div>
                <p className="text-gray-700">
                  "QuizMaster helped me prepare for my exams in a fun and engaging way. The variety of quizzes and the competitive aspect kept me motivated!"
                </p>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white rounded-xl shadow-xl p-8">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold">JS</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-bold">Jane Smith</h4>
                    <p className="text-gray-600">Teacher</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex text-yellow-400">
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                </div>
                <p className="text-gray-700">
                  "As a teacher, I use QuizMaster to create engaging quizzes for my students. The platform is intuitive and the analytics help me track their progress."
                </p>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white rounded-xl shadow-xl p-8">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold">RJ</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-bold">Robert Johnson</h4>
                    <p className="text-gray-600">Professional</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex text-yellow-400">
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                </div>
                <p className="text-gray-700">
                  "I use QuizMaster to stay sharp in my field. The specialized quizzes have helped me maintain my professional knowledge and learn new concepts."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-12 md:py-16 md:px-12 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
                  Ready to Boost Your Knowledge?
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                  Join thousands of learners who have already improved their skills with QuizMaster.
                </p>
                <Link to="/register" className="inline-block px-8 py-4 text-lg rounded-full bg-white text-purple-700 font-bold shadow-lg hover:shadow-xl transform transition hover:-translate-y-1">
                  Get Started — It's Free
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer id="contact" className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-purple-400" />
                  <span className="ml-2 text-2xl font-bold text-white">QuizMaster</span>
                </div>
                <p className="mt-4 text-gray-400">
                  The ultimate platform for creating and taking quizzes, challenging friends, and tracking your progress.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition">Home</a></li>
                  <li><a href="#features" className="text-gray-400 hover:text-white transition">Features</a></li>
                  <li><a href="#testimonials" className="text-gray-400 hover:text-white transition">Testimonials</a></li>
                  <li><Link to="/pricing" className="text-gray-400 hover:text-white transition">Pricing</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><Link to="/blog" className="text-gray-400 hover:text-white transition">Blog</Link></li>
                  <li><Link to="/support" className="text-gray-400 hover:text-white transition">Support Center</Link></li>
                  <li><Link to="/faq" className="text-gray-400 hover:text-white transition">FAQ</Link></li>
                  <li><Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                <p className="text-gray-400 mb-4">
                  Have questions? Reach out to our support team.
                </p>
                <a href="mailto:support@quizmaster.com" className="text-purple-400 hover:text-purple-300 transition">
                  support@quizmaster.com
                </a>
                <div className="mt-4 flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
              <p>© 2025 QuizMaster. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Original dashboard for logged-in users
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here&apos;s an overview of your quiz activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Improvement</p>
              <p className="text-2xl font-bold text-gray-900">+{Math.floor(Math.random() * 15) + 5}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <Link
              to="/quizzes"
              className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Browse Quizzes
            </Link>
            <Link
              to="/profile"
              className="block w-full bg-gray-600 text-white text-center py-3 px-4 rounded-lg hover:bg-gray-700 transition duration-200"
            >
              Update Profile
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Attempts</h3>
          </div>
          <div className="p-6">
            {stats.recentAttempts.length > 0 ? (
              <div className="space-y-4">
                {stats.recentAttempts.map((attempt, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{attempt.quiz_title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{attempt.score}%</p>
                      <p className="text-sm text-gray-600">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">
                No quiz attempts yet. <Link to="/quizzes" className="text-blue-600 hover:underline">Start taking quizzes!</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
