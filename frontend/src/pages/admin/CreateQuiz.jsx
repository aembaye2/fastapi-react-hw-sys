import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { quizService } from "../../services/quizService";
import toast from "react-hot-toast";

const CreateQuiz = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      time_limit: "",
      difficulty: "medium",
      questions: [
        {
          type: "multiplechoice",
          question_text: "",
          numeric_answer: null,
          formula_expression: "",
          formula_generator_code:
            "import random\na = random.randint(1, 10)\nb = random.randint(1, 10)",
          formula_variables: [{ name: "a", min_value: 1, max_value: 10 }],
          options: [
            { option_text: "", is_correct: true },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
          ],
        },
      ],
    },
  });

  const {
    fields,
    append,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name: "questions",
  });

  const watchedQuestions = useWatch({
    control,
    name: "questions",
  });

  const getDefaultOptions = () => [
    { option_text: "", is_correct: true },
    { option_text: "", is_correct: false },
  ];

  const normalizeGeneratorCode = (code) => {
    const value = String(code || "").trim();
    if (!value.startsWith("```")) {
      return value;
    }

    const lines = value.split("\n");
    if (
      lines.length >= 2 &&
      lines[0].startsWith("```") &&
      lines[lines.length - 1].trim() === "```"
    ) {
      return lines.slice(1, -1).join("\n").trim();
    }

    return value;
  };

  const setQuestionType = (questionIndex, type) => {
    setValue(`questions.${questionIndex}.type`, type);
    if (type === "numeric") {
      setValue(`questions.${questionIndex}.numeric_answer`, null);
      setValue(`questions.${questionIndex}.options`, []);
      return;
    }

    if (type === "formula") {
      setValue(`questions.${questionIndex}.numeric_answer`, null);
      setValue(`questions.${questionIndex}.options`, []);

      const expression = getValues(
        `questions.${questionIndex}.formula_expression`,
      );
      if (!expression) {
        setValue(`questions.${questionIndex}.formula_expression`, "a + b");
      }

      const generatorCode = getValues(
        `questions.${questionIndex}.formula_generator_code`,
      );
      if (!generatorCode) {
        setValue(
          `questions.${questionIndex}.formula_generator_code`,
          "import random\na = random.randint(1, 10)\nb = random.randint(1, 10)",
        );
      }
      return;
    }

    const currentOptions = getValues(`questions.${questionIndex}.options`);
    if (!Array.isArray(currentOptions) || currentOptions.length < 2) {
      setValue(`questions.${questionIndex}.options`, getDefaultOptions());
    }
  };

  // Add option without erasing other data
  const addOption = (questionIndex) => {
    const currentQuestions = getValues("questions");
    const question = currentQuestions[questionIndex];

    if (question.options.length < 6) {
      const newOptions = [
        ...question.options,
        { option_text: "", is_correct: false },
      ];
      setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  // Remove option without erasing other data
  const removeOption = (questionIndex, optionIndex) => {
    const currentQuestions = getValues("questions");
    const question = currentQuestions[questionIndex];

    if (question.options.length > 2) {
      const newOptions = question.options.filter(
        (_, index) => index !== optionIndex,
      );
      // Ensure at least one option is correct
      const hasCorrectOption = newOptions.some((opt) => opt.is_correct);
      if (!hasCorrectOption && newOptions.length > 0) {
        newOptions[0].is_correct = true;
      }
      setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  // Toggle option correctness (allows multiple correct answers)
  const toggleOptionCorrect = (questionIndex, optionIndex) => {
    const currentQuestions = getValues("questions");
    const question = currentQuestions[questionIndex];
    const newOptions = [...question.options];
    newOptions[optionIndex].is_correct = !newOptions[optionIndex].is_correct;
    setValue(`questions.${questionIndex}.options`, newOptions);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const normalizedQuestions = data.questions.map((question) => {
        const questionType = question.type || "multiplechoice";

        if (questionType === "numeric") {
          const numericValue = Number(question.numeric_answer);
          return {
            type: "numeric",
            question_text: question.question_text,
            numeric_answer: Number.isFinite(numericValue) ? numericValue : null,
            options: [],
          };
        }

        if (questionType === "formula") {
          return {
            type: "formula",
            question_text: question.question_text,
            formula_expression: String(
              question.formula_expression || "",
            ).trim(),
            formula_generator_code: normalizeGeneratorCode(
              question.formula_generator_code,
            ),
            formula_variables: [],
            options: [],
            numeric_answer: null,
          };
        }

        const options = Array.isArray(question.options) ? question.options : [];
        return {
          type: "multiplechoice",
          question_text: question.question_text,
          options,
          numeric_answer: null,
        };
      });

      for (const question of normalizedQuestions) {
        if (question.type === "numeric") {
          if (question.numeric_answer === null) {
            toast.error("Numeric questions require a numeric correct answer.");
            setLoading(false);
            return;
          }
          continue;
        }

        if (question.type === "formula") {
          if (!question.formula_expression) {
            toast.error("Formula questions require a formula expression.");
            setLoading(false);
            return;
          }

          if (!question.formula_generator_code) {
            toast.error("Formula questions require generator code.");
            setLoading(false);
            return;
          }

          continue;
        }

        if (!question.options || question.options.length < 2) {
          toast.error(
            "Multiple choice questions require at least two options.",
          );
          setLoading(false);
          return;
        }

        if (!question.options.some((opt) => opt.is_correct)) {
          toast.error(
            "Each multiple choice question must have at least one correct answer.",
          );
          setLoading(false);
          return;
        }
      }

      // Format data according to backend schema
      const quizData = {
        title: data.title,
        description: data.description,
        time_limit: data.time_limit ? parseInt(data.time_limit) : null,
        difficulty: data.difficulty,
        questions: normalizedQuestions,
      };

      const result = await quizService.createQuiz(quizData);
      if (result.success) {
        toast.success("Quiz created successfully!");
        navigate("/admin/quizzes");
      } else {
        toast.error(result.error || "Failed to create quiz");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate("/admin/quizzes")}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Quiz</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Quiz Information Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Quiz Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                {...register("title", { required: "Quiz title is required" })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register("description", {
                  required: "Description is required",
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Limit (minutes)
              </label>
              <input
                {...register("time_limit")}
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                {...register("difficulty")}
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
              onClick={() =>
                append({
                  type: "multiplechoice",
                  question_text: "",
                  numeric_answer: null,
                  formula_expression: "",
                  formula_generator_code:
                    "import random\na = random.randint(1, 10)\nb = random.randint(1, 10)",
                  formula_variables: [
                    { name: "a", min_value: 1, max_value: 10 },
                  ],
                  options: [
                    { option_text: "", is_correct: true },
                    { option_text: "", is_correct: false },
                  ],
                })
              }
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
                  <h3 className="text-lg font-medium">
                    Question {questionIndex + 1}
                  </h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
                  </label>
                  <select
                    {...register(`questions.${questionIndex}.type`)}
                    onChange={(e) =>
                      setQuestionType(questionIndex, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="multiplechoice">Multiple Choice</option>
                    <option value="numeric">Numeric</option>
                    <option value="formula">Formula</option>
                  </select>
                </div>

                {(watchedQuestions?.[questionIndex]?.type ||
                  "multiplechoice") !== "formula" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      {...register(`questions.${questionIndex}.question_text`, {
                        required: "Question text is required",
                      })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.questions?.[questionIndex]?.question_text && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.questions[questionIndex].question_text.message}
                      </p>
                    )}
                  </div>
                )}

                {(watchedQuestions?.[questionIndex]?.type ||
                  "multiplechoice") === "numeric" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Numeric Answer *
                    </label>
                    <input
                      {...register(
                        `questions.${questionIndex}.numeric_answer`,
                        {
                          setValueAs: (value) =>
                            value === "" ? null : Number(value),
                        },
                      )}
                      type="number"
                      step="any"
                      placeholder="e.g. 4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (watchedQuestions?.[questionIndex]?.type ||
                    "multiplechoice") === "formula" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Use placeholders in question text like {"{a}"} or {"{b}"},
                      and define those variables in the generator code below.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variable Generator Code *
                      </label>
                      <textarea
                        {...register(
                          `questions.${questionIndex}.formula_generator_code`,
                          {
                            required: "Generator code is required",
                          },
                        )}
                        rows={7}
                        placeholder={
                          "import random\na = random.randint(1, 10)\nb = random.randint(1, 10)"
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Allowed: imports from random/math, assignments, numeric
                        expressions, random.* and math.* calls.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <textarea
                        {...register(
                          `questions.${questionIndex}.question_text`,
                          {
                            required: "Question text is required",
                          },
                        )}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.questions?.[questionIndex]?.question_text && (
                        <p className="mt-1 text-sm text-red-600">
                          {
                            errors.questions[questionIndex].question_text
                              .message
                          }
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Formula Expression *
                      </label>
                      <input
                        {...register(
                          `questions.${questionIndex}.formula_expression`,
                          {
                            required: "Formula expression is required",
                          },
                        )}
                        type="text"
                        placeholder="e.g. a + b"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer Options
                    </label>
                    <Controller
                      control={control}
                      name={`questions.${questionIndex}.options`}
                      render={({ field }) => (
                        <div className="space-y-2">
                          {field.value.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="flex items-center space-x-2"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleOptionCorrect(
                                    questionIndex,
                                    optionIndex,
                                  )
                                }
                                className={`p-1 rounded ${option.is_correct ? "text-green-600" : "text-gray-400"} hover:text-green-700`}
                              >
                                {option.is_correct ? (
                                  <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                                )}
                              </button>
                              <input
                                {...register(
                                  `questions.${questionIndex}.options.${optionIndex}.option_text`,
                                  { required: "Option text is required" },
                                )}
                                type="text"
                                placeholder={`Option ${optionIndex + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {field.value.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeOption(questionIndex, optionIndex)
                                  }
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          {field.value.length < 6 && (
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
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/admin/quizzes")}
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
            {loading ? "Creating..." : "Create Quiz"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuiz;
