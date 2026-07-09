import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import { quizService } from '../services/quizService'
import toast from 'react-hot-toast'
import api from '../services/api' // Adjust the import based on your project structure

const TakeQuiz = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [startTime, setStartTime] = useState(null) // Track start time

  const fetchQuizData = useCallback(async () => {
    try {
      const result = await quizService.getQuizById(id)

      if (result.success) {
        setQuiz(result.data)
        // Set initial time if quiz has time limit
        if (result.data.time_limit) {
          setTimeLeft(result.data.time_limit * 60) // Convert minutes to seconds
        }
      } else {
        toast.error(result.error || 'Failed to load quiz')
        navigate('/quizzes')
      }
    } catch (error) {
      console.error('Error fetching quiz:', error)
      toast.error('Failed to load quiz')
      navigate('/quizzes')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return

    setSubmitting(true)
    try {
      // Calculate time taken in seconds
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : null

      // Format answers for submission
      const formattedAnswers = Object.entries(answers).map(([questionIndex, selectedOptions]) => ({
        question_index: parseInt(questionIndex),
        selected_options: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions]
      }))

      // Submit with time tracking
      const response = await api.post(`/quizzes/${id}/submit`, {
        quiz_id: id,
        answers: formattedAnswers,
        time_taken: timeTaken
      })

      if (response.data) {
        toast.success(isAutoSubmit ? 'Time up! Quiz auto-submitted' : 'Quiz submitted successfully!')
        navigate(`/quiz/${id}/results/${response.data.id || response.data._id}`)
      } else {
        toast.error('Failed to submit quiz')
        setSubmitting(false)
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
      toast.error('Failed to submit quiz')
      setSubmitting(false)
    }
  }, [id, answers, submitting, navigate, startTime])

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeLeft === null || timeLeft <= 0 || submitting) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitQuiz(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, quizStarted, submitting, handleSubmitQuiz])

  useEffect(() => {
    fetchQuizData()
  }, [fetchQuizData])

  const formatTime = (seconds) => {
    if (seconds === null) return 'No time limit'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers(prev => {
      const currentAnswers = prev[questionIndex] || []
      const isSelected = currentAnswers.includes(optionIndex)

      if (isSelected) {
        // Remove answer if already selected (untick)
        return {
          ...prev,
          [questionIndex]: currentAnswers.filter(idx => idx !== optionIndex)
        }
      } else {
        // Add answer (tick)
        return {
          ...prev,
          [questionIndex]: [...currentAnswers, optionIndex]
        }
      }
    })
  }

  const goToNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const startQuiz = () => {
    setQuizStarted(true)
    setStartTime(Date.now()) // Set the actual start time
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz not found or has no questions</h3>
        <button
          onClick={() => navigate('/quizzes')}
          className="text-blue-600 hover:underline"
        >
          Back to quizzes
        </button>
      </div>
    )
  }

  // Pre-quiz start screen
  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
          <p className="text-gray-600 mb-6">{quiz.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{quiz.questions.length}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}
              </div>
              <div className="text-sm text-gray-600">Time Limit</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 capitalize">
                {quiz.difficulty || 'Medium'}
              </div>
              <div className="text-sm text-gray-600">Difficulty</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Important Instructions & Ethics:</h3>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>• <strong>Purpose:</strong> This quiz is designed to assess your current knowledge and help you identify areas for improvement.</p>
                  <p>• <strong>Academic Integrity:</strong> Please answer honestly based on your own knowledge. Using AI tools, search engines, or external help defeats the purpose of self-assessment.</p>
                  <p>• <strong>Learning Opportunity:</strong> View incorrect answers as learning opportunities rather than failures.</p>
                  <p>• <strong>Multiple Answers:</strong> Some questions may have multiple correct answers - select all that apply.</p>
                  <p>• <strong>Navigation:</strong> You can move between questions freely and change your answers before submitting.</p>
                  {quiz.time_limit && <p>• <strong>Time Management:</strong> You have {quiz.time_limit} minutes. The quiz will auto-submit when time expires.</p>}
                  <p>• <strong>Confidence Building:</strong> Real confidence comes from genuine understanding, not from shortcuts.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={startQuiz}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const currentAnswers = answers[currentQuestionIndex] || []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Timer and Progress */}
      <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">{quiz.title}</h1>
            <span className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
          </div>

          {timeLeft !== null && (
            <div className="flex items-center space-x-2">
              <Clock className={`h-5 w-5 ${timeLeft <= 300 ? 'text-red-500' : 'text-gray-500'}`} />
              <span className={`text-lg font-mono ${timeLeft <= 300 ? 'text-red-500 font-bold' : 'text-gray-700'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {currentQuestion.options.map((option, optionIndex) => {
            const isSelected = currentAnswers.includes(optionIndex)

            return (
              <button
                key={optionIndex}
                onClick={() => handleAnswerSelect(currentQuestionIndex, optionIndex)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1">{option.option_text}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Navigation and Submit */}
        <div className="flex justify-between items-center">
          <button
            onClick={goToPrevious}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center px-6 py-2 rounded-lg font-medium transition duration-200 ${
              currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            {currentAnswers.length > 0 ? (
              `${currentAnswers.length} option${currentAnswers.length > 1 ? 's' : ''} selected`
            ) : (
              'No options selected'
            )}
          </div>

          <div className="flex space-x-3">
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={goToNext}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmitQuiz(false)}
                disabled={submitting}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition duration-200"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Question Navigation</h3>
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-10 h-10 rounded-lg font-medium text-sm transition duration-200 ${
                index === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : answers[index]?.length > 0
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TakeQuiz
