import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Award, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { quizService } from '../services/quizService'
import toast from 'react-hot-toast'

const QuizResults = () => {
  const { id: quizId, attemptId } = useParams()
  const [results, setResults] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchResults = useCallback(async () => {
    try {
      console.log('Fetching results for attempt:', attemptId, 'quiz:', quizId)

      const [resultsData, quizData] = await Promise.all([
        quizService.getAttemptById(attemptId),
        quizService.getQuizById(quizId)
      ])

      console.log('Results data:', resultsData)
      console.log('Quiz data:', quizData)

      if (resultsData.success && quizData.success) {
        setResults(resultsData.data)
        setQuiz(quizData.data)
      } else {
        console.error('Failed to fetch data:', { resultsData, quizData })
        toast.error(resultsData.error || quizData.error || 'Failed to load quiz results')
      }
    } catch (error) {
      console.error('Error fetching results:', error)
      toast.error('Failed to load quiz results')
    } finally {
      setLoading(false)
    }
  }, [attemptId, quizId])

  useEffect(() => {
    if (attemptId && quizId) {
      fetchResults()
    }
  }, [attemptId, quizId, fetchResults])

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!results || !quiz) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Results not found</h3>
        <Link to="/attempts" className="text-blue-600 hover:underline">
          Back to attempts
        </Link>
      </div>
    )
  }

  const correctAnswers = results.answers?.filter((answer, index) => {
    const question = quiz.questions[answer.question_index]
    if (!question) return false

    const correctOptions = question.options
      .map((opt, idx) => opt.is_correct ? idx : null)
      .filter(idx => idx !== null)

    return JSON.stringify(answer.selected_options.sort()) === JSON.stringify(correctOptions.sort())
  }).length || 0

  const totalQuestions = quiz.questions?.length || 0
  const score = results.score || 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to="/attempts"
        className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Attempts
      </Link>

      {/* Results Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className={`p-8 ${getScoreBgColor(score)}`}>
          <div className="text-center">
            <Award className={`h-16 w-16 mx-auto mb-4 ${getScoreColor(score)}`} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h1>
            <h2 className="text-xl text-gray-700">{quiz.title}</h2>
          </div>
        </div>

        {/* Score Summary */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Final Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-700">{totalQuestions}</div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {formatTime(results.time_taken)}
              </div>
              <div className="text-sm text-gray-600">Time Taken</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Question Review</h3>
        <div className="space-y-6">
          {quiz.questions.map((question, index) => {
            const userAnswer = results.answers?.find(ans => ans.question_index === index)
            const correctOptions = question.options
              .map((opt, idx) => opt.is_correct ? idx : null)
              .filter(idx => idx !== null)

            const isCorrect = userAnswer ?
              JSON.stringify(userAnswer.selected_options.sort()) === JSON.stringify(correctOptions.sort()) :
              false

            return (
              <div key={index} className="border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900 flex-1">
                    {index + 1}. {question.question_text}
                  </h4>
                  {isCorrect ? (
                    <CheckCircle className="h-6 w-6 text-green-500 ml-4" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500 ml-4" />
                  )}
                </div>

                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = userAnswer?.selected_options.includes(optionIndex)
                    const isCorrectOption = option.is_correct

                    let optionClass = "p-3 rounded border "
                    if (isCorrectOption && isSelected) {
                      optionClass += "bg-green-100 border-green-300 text-green-800"
                    } else if (isCorrectOption) {
                      optionClass += "bg-green-50 border-green-200 text-green-700"
                    } else if (isSelected) {
                      optionClass += "bg-red-100 border-red-300 text-red-800"
                    } else {
                      optionClass += "bg-gray-50 border-gray-200 text-gray-700"
                    }

                    return (
                      <div key={optionIndex} className={optionClass}>
                        <div className="flex items-center">
                          <span className="flex-1">{option.option_text}</span>
                          <div className="flex items-center space-x-2">
                            {isSelected && <span className="text-sm">(Your answer)</span>}
                            {isCorrectOption && <span className="text-sm font-medium">(Correct)</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 text-center space-x-4">
        <Link
          to="/quizzes"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Take Another Quiz
        </Link>
        <Link
          to="/attempts"
          className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition duration-200"
        >
          View All Attempts
        </Link>
      </div>
    </div>
  )
}

export default QuizResults
