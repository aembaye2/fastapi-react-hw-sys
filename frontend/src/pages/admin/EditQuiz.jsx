import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { quizService } from '../../services/quizService';
import toast from 'react-hot-toast';

const EditQuiz = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  const { register, control, handleSubmit, formState: { errors }, getValues, setValue, reset } = useForm({
    defaultValues: {
      title: '',
      description: '',
      time_limit: '',
      difficulty: 'medium',
      questions: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  });

  useEffect(() => {
    fetchQuizData();
  }, [id]);

  const fetchQuizData = async () => {
    try {
      setInitialLoading(true);
      const result = await quizService.getQuizById(id);

      if (result.success) {
        const quizData = result.data;
        reset({
          title: quizData.title || '',
          description: quizData.description || '',
          time_limit: quizData.time_limit?.toString() || '',
          difficulty: quizData.difficulty || 'medium',
          questions: quizData.questions || []
        });
      } else {
        toast.error(result.error || 'Failed to load quiz data');
        navigate('/admin/quizzes');
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      toast.error('Failed to load quiz data');
      navigate('/admin/quizzes');
    } finally {
      setInitialLoading(false);
    }
  };

  // Add option without erasing other data
  const addOption = (questionIndex) => {
    const currentQuestions = getValues('questions');
    const question = currentQuestions[questionIndex];

    if (question.options.length < 6) {
      const newOptions = [...question.options, { option_text: '', is_correct: false }];
      setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  // Remove option without erasing other data
  const removeOption = (questionIndex, optionIndex) => {
    const currentQuestions = getValues('questions');
    const question = currentQuestions[questionIndex];

    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      // Ensure at least one option is correct
      const hasCorrectOption = newOptions.some(opt => opt.is_correct);
      if (!hasCorrectOption && newOptions.length > 0) {
        newOptions[0].is_correct = true;
      }
      setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  // Toggle option correctness (allows multiple correct answers)
  const toggleOptionCorrect = (questionIndex, optionIndex) => {
    const currentQuestions = getValues('questions');
    const question = currentQuestions[questionIndex];
    const newOptions = [...question.options];
    newOptions[optionIndex].is_correct = !newOptions[optionIndex].is_correct;
    setValue(`questions.${questionIndex}.options`, newOptions);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Validate that each question has at least one correct answer
      const invalidQuestions = data.questions.filter(q => !q.options.some(opt => opt.is_correct));
      if (invalidQuestions.length > 0) {
        toast.error('Each question must have at least one correct answer.');
        setLoading(false);
        return;
      }

      // Format data according to backend schema
      const quizData = {
        title: data.title,
        description: data.description,
        time_limit: data.time_limit ? parseInt(data.time_limit) : null,
        difficulty: data.difficulty,
        questions: data.questions
      };

      const result = await quizService.updateQuiz(id, quizData);
      if (result.success) {
        toast.success('Quiz updated successfully!');
        navigate('/admin/quizzes');
      } else {
        toast.error(result.error || 'Failed to update quiz');
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button onClick={() => navigate('/admin/quizzes')} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Quiz</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Quiz Information Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quiz Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
              <input
                {...register('title', { required: 'Quiz title is required' })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
              <input
                {...register('time_limit')}
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                {...register('difficulty')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
            <button
              type="button"
              onClick={() => append({
                question_text: '',
                options: [
                  { option_text: '', is_correct: true },
                  { option_text: '', is_correct: false }
                ]
              })}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </button>
          </div>

          <div className="space-y-8">
            {fields.map((field, questionIndex) => (
              <div key={field.id} className="border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium">Question {questionIndex + 1}</h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(questionIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
                  <textarea
                    {...register(`questions.${questionIndex}.question_text`, { required: 'Question text is required' })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.questions?.[questionIndex]?.question_text && (
                    <p className="mt-1 text-sm text-red-600">{errors.questions[questionIndex].question_text.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                  <Controller
                    control={control}
                    name={`questions.${questionIndex}.options`}
                    render={({ field }) => (
                      <div className="space-y-2">
                        {field.value?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => toggleOptionCorrect(questionIndex, optionIndex)}
                              className={`p-1 rounded ${option.is_correct ? 'text-green-600' : 'text-gray-400'} hover:text-green-700`}
                            >
                              {option.is_correct ? (
                                <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                              )}
                            </button>
                            <input
                              {...register(`questions.${questionIndex}.options.${optionIndex}.option_text`, { required: 'Option text is required' })}
                              type="text"
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {field.value?.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {field.value?.length < 6 && (
                          <button
                            type="button"
                            onClick={() => addOption(questionIndex)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/quizzes')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : 'Update Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditQuiz;
