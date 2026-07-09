import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, Award, TrendingUp, Plus, Settings, Clock, Target, BarChart3, PieChart } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_quizzes: 0,
    total_attempts: 0,
    total_minutes_taken: 0,
    avg_score_percentage: 0,
    avg_attempts_per_user: 0,
    avg_attempts_per_quiz: 0,
    user_engagement: 0,
    recent_activity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Dashboard error:', error)
      toast.error('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, bgColor, textColor, subtitle }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${textColor || 'text-gray-900'}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 ${bgColor || 'bg-blue-100'} rounded-lg`}>
          <Icon className={`h-8 w-8 ${color || 'text-blue-600'}`} />
        </div>
      </div>
    </div>
  )

  const SimpleChart = ({ data, title, color = "bg-blue-500" }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{item.label}</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${Math.min(item.percentage || 0, 100)}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Prepare chart data
  const activityData = stats.recent_activity.map(activity => ({
    label: activity._id || 'Unknown',
    value: activity.count || 0,
    percentage: Math.min((activity.count || 0) / Math.max(...stats.recent_activity.map(a => a.count || 0)) * 100, 100)
  }))

  const engagementData = [
    { label: 'Engaged Users', value: `${stats.user_engagement}%`, percentage: stats.user_engagement },
    { label: 'Non-Engaged', value: `${(100 - stats.user_engagement).toFixed(1)}%`, percentage: 100 - stats.user_engagement }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Comprehensive overview of your quiz platform</p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/admin/users"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
              <Link
                to="/admin/quizzes"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition duration-200"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Manage Quizzes
              </Link>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.total_users.toLocaleString()}
            icon={Users}
            color="text-blue-600"
            bgColor="bg-blue-100"
            textColor="text-blue-700"
          />
          <StatCard
            title="Total Quizzes"
            value={stats.total_quizzes.toLocaleString()}
            icon={BookOpen}
            color="text-green-600"
            bgColor="bg-green-100"
            textColor="text-green-700"
          />
          <StatCard
            title="Total Attempts"
            value={stats.total_attempts.toLocaleString()}
            icon={Award}
            color="text-purple-600"
            bgColor="bg-purple-100"
            textColor="text-purple-700"
          />
          <StatCard
            title="Total Minutes"
            value={stats.total_minutes_taken.toLocaleString()}
            icon={Clock}
            color="text-orange-600"
            bgColor="bg-orange-100"
            textColor="text-orange-700"
            subtitle="Time spent on quizzes"
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Avg Score"
            value={`${stats.avg_score_percentage}%`}
            icon={Target}
            color="text-emerald-600"
            bgColor="bg-emerald-100"
            textColor="text-emerald-700"
          />
          <StatCard
            title="Attempts per User"
            value={stats.avg_attempts_per_user}
            icon={TrendingUp}
            color="text-indigo-600"
            bgColor="bg-indigo-100"
            textColor="text-indigo-700"
          />
          <StatCard
            title="Attempts per Quiz"
            value={stats.avg_attempts_per_quiz}
            icon={BarChart3}
            color="text-pink-600"
            bgColor="bg-pink-100"
            textColor="text-pink-700"
          />
          <StatCard
            title="User Engagement"
            value={`${stats.user_engagement}%`}
            icon={PieChart}
            color="text-teal-600"
            bgColor="bg-teal-100"
            textColor="text-teal-700"
            subtitle="Users who took quizzes"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SimpleChart
            title="Recent Quiz Activity (Last 7 Days)"
            data={activityData}
            color="bg-blue-500"
          />
          <SimpleChart
            title="User Engagement Breakdown"
            data={engagementData}
            color="bg-teal-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/quizzes/create"
              className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-colors duration-200"
            >
              <Plus className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-blue-900">Create New Quiz</p>
                <p className="text-sm text-blue-600">Add a new quiz to the platform</p>
              </div>
            </Link>

            <Link
              to="/admin/users"
              className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-colors duration-200"
            >
              <Users className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-900">Manage Users</p>
                <p className="text-sm text-green-600">View and manage user accounts</p>
              </div>
            </Link>

            <Link
              to="/admin/quizzes"
              className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-colors duration-200"
            >
              <Settings className="h-6 w-6 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-purple-900">Quiz Management</p>
                <p className="text-sm text-purple-600">Edit and organize quizzes</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-4">Platform Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-medium mb-2">Quiz Completion Rate</h4>
              <p className="text-2xl font-bold">{stats.total_attempts > 0 ? ((stats.total_attempts / (stats.total_users || 1)) * 100).toFixed(1) : 0}%</p>
              <p className="text-sm opacity-80">Based on total attempts vs users</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-medium mb-2">Average Session Time</h4>
              <p className="text-2xl font-bold">{stats.total_attempts > 0 ? (stats.total_minutes_taken / stats.total_attempts).toFixed(1) : 0} min</p>
              <p className="text-sm opacity-80">Time per quiz attempt</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-medium mb-2">Platform Growth</h4>
              <p className="text-2xl font-bold">+{stats.recent_activity.length}</p>
              <p className="text-sm opacity-80">Active days this week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
