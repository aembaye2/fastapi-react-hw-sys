import ast
import math
import operator
import random
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, List
from bson import ObjectId
from .. import schemas
from ..db.database import get_db
from ..auth.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()


def _strip_markdown_code_fence(code: str) -> str:
    value = (code or "").strip()
    if not value.startswith("```"):
        return value

    lines = value.splitlines()
    if len(lines) >= 2 and lines[0].startswith("```") and lines[-1].strip() == "```":
        body = "\n".join(lines[1:-1])
        return body.strip()

    return value


def _normalize_formula_expression(expression: str) -> str:
    normalized = str(expression or "").strip()
    normalized = normalized.replace("\\cdot", "*")
    normalized = normalized.replace("\\times", "*")
    normalized = normalized.replace("×", "*")
    normalized = normalized.replace("÷", "/")
    normalized = normalized.replace("^", "**")
    return normalized


def _render_formula_question_text(template: str, values: Dict[str, float]) -> str:
    placeholder_pattern = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")

    def _replace(match: re.Match[str]) -> str:
        variable_name = match.group(1)
        if variable_name not in values:
            raise ValueError(
                f"Unknown placeholder variable in question_text: {variable_name}")
        return str(values[variable_name])

    return placeholder_pattern.sub(_replace, str(template or ""))


def _evaluate_safe_generator_expression(node: ast.AST, env: Dict[str, Any]) -> float:
    binary_ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
    }
    unary_ops = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)

    if isinstance(node, ast.Name):
        if node.id not in env:
            raise ValueError(f"Unknown variable in generator code: {node.id}")
        value = env[node.id]
        if not isinstance(value, (int, float)):
            raise ValueError(
                f"Generator variable '{node.id}' is not numeric and cannot be used in arithmetic")
        return float(value)

    if isinstance(node, ast.BinOp):
        operation = binary_ops.get(type(node.op))
        if operation is None:
            raise ValueError("Unsupported binary operation in generator code")
        return float(operation(
            _evaluate_safe_generator_expression(node.left, env),
            _evaluate_safe_generator_expression(node.right, env),
        ))

    if isinstance(node, ast.UnaryOp):
        operation = unary_ops.get(type(node.op))
        if operation is None:
            raise ValueError("Unsupported unary operation in generator code")
        return float(operation(
            _evaluate_safe_generator_expression(node.operand, env)))

    if isinstance(node, ast.Call):
        func = node.func
        positional_args = [_evaluate_safe_generator_expression(arg, env)
                           for arg in node.args]
        keyword_args = {
            kw.arg: _evaluate_safe_generator_expression(kw.value, env)
            for kw in node.keywords
            if kw.arg is not None
        }

        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            module_name = func.value.id
            function_name = func.attr

            if module_name == "random":
                allowed_random_functions = {
                    "random": random.random,
                    "randint": random.randint,
                    "uniform": random.uniform,
                    "normalvariate": random.normalvariate,
                    "gauss": random.gauss,
                    "triangular": random.triangular,
                }
                if function_name not in allowed_random_functions:
                    raise ValueError(
                        f"random.{function_name} is not allowed in generator code")
                return float(allowed_random_functions[function_name](
                    *positional_args, **keyword_args))

            if module_name == "math":
                allowed_math_functions = {
                    "sqrt": math.sqrt,
                    "sin": math.sin,
                    "cos": math.cos,
                    "tan": math.tan,
                    "log": math.log,
                    "log10": math.log10,
                    "exp": math.exp,
                    "fabs": math.fabs,
                    "ceil": math.ceil,
                    "floor": math.floor,
                }
                if function_name not in allowed_math_functions:
                    raise ValueError(
                        f"math.{function_name} is not allowed in generator code")
                return float(allowed_math_functions[function_name](
                    *positional_args, **keyword_args))

            raise ValueError(
                "Only calls to random.* and math.* are allowed in generator code")

        if isinstance(func, ast.Name):
            allowed_builtin_functions = {
                "abs": abs,
                "min": min,
                "max": max,
                "int": int,
                "float": float,
            }
            if func.id == "round":
                if len(positional_args) == 1:
                    return float(round(positional_args[0]))
                if len(positional_args) == 2:
                    ndigits = positional_args[1]
                    if not float(ndigits).is_integer():
                        raise ValueError(
                            "round() second argument must be an integer in generator code")
                    return float(round(positional_args[0], int(ndigits)))
                raise ValueError(
                    "round() in generator code supports one or two positional arguments")

            if func.id not in allowed_builtin_functions:
                raise ValueError(
                    f"Function '{func.id}' is not allowed in generator code")
            return float(allowed_builtin_functions[func.id](
                *positional_args, **keyword_args))

        raise ValueError("Unsupported function call in generator code")

    raise ValueError("Unsupported expression in generator code")


def _execute_formula_generator_code(code: str) -> Dict[str, float]:
    normalized_code = _strip_markdown_code_fence(code)
    tree = ast.parse(normalized_code, mode="exec")

    env: Dict[str, Any] = {
        "random": random,
        "math": math,
    }
    generated_values: Dict[str, float] = {}

    for statement in tree.body:
        if isinstance(statement, ast.Import):
            for alias in statement.names:
                if alias.name == "random":
                    env[alias.asname or "random"] = random
                    continue
                if alias.name == "math":
                    env[alias.asname or "math"] = math
                    continue
                raise ValueError(
                    "Only importing random or math is supported")
            continue

        if isinstance(statement, ast.ImportFrom):
            module_name = statement.module
            if module_name not in {"random", "math"}:
                raise ValueError(
                    "Only imports from random or math are supported")

            source_module = random if module_name == "random" else math
            for alias in statement.names:
                if alias.name == "*":
                    raise ValueError("Wildcard imports are not supported")
                if not hasattr(source_module, alias.name):
                    raise ValueError(
                        f"Unknown symbol '{alias.name}' in import from {module_name}")
                env[alias.asname or alias.name] = getattr(source_module,
                                                          alias.name)
            continue

        if isinstance(statement, ast.Expr):
            _evaluate_safe_generator_expression(statement.value, env)
            continue

        if isinstance(statement, ast.Assign):
            if len(statement.targets) != 1 or not isinstance(statement.targets[0], ast.Name):
                raise ValueError(
                    "Generator code only supports simple variable assignments")

            target_name = statement.targets[0].id
            value = _evaluate_safe_generator_expression(statement.value, env)
            env[target_name] = value

            if target_name not in {"random", "math"}:
                generated_values[target_name] = value
            continue

        raise ValueError(
            "Generator code only supports imports, assignments, and expressions")

    if not generated_values:
        raise ValueError(
            "Generator code did not define any variables")

    return generated_values


def _evaluate_formula_expression(expression: str, values: Dict[str, float]) -> float:
    normalized_expression = _normalize_formula_expression(expression)
    tree = ast.parse(normalized_expression, mode="eval")

    binary_ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
    }
    unary_ops = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    def _eval(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.Name):
            if node.id not in values:
                raise ValueError(f"Unknown formula variable: {node.id}")
            return float(values[node.id])
        if isinstance(node, ast.BinOp):
            operation = binary_ops.get(type(node.op))
            if operation is None:
                raise ValueError(
                    "Unsupported binary operation in formula expression")
            return float(operation(_eval(node.left), _eval(node.right)))
        if isinstance(node, ast.UnaryOp):
            operation = unary_ops.get(type(node.op))
            if operation is None:
                raise ValueError(
                    "Unsupported unary operation in formula expression")
            return float(operation(_eval(node.operand)))
        raise ValueError("Unsupported syntax in formula expression")

    return _eval(tree)


def _build_formula_question_instance(question: Dict[str, Any]) -> Dict[str, Any]:
    generator_code = _strip_markdown_code_fence(
        question.get("formula_generator_code") or "")
    generated_values: Dict[str, float] = {}

    if generator_code:
        generated_values = _execute_formula_generator_code(generator_code)
    else:
        variables_config = question.get("formula_variables") or []
        for variable in variables_config:
            name = variable.get("name")
            minimum = variable.get("min_value")
            maximum = variable.get("max_value")

            if name is None or minimum is None or maximum is None:
                raise ValueError(
                    "Formula variable configuration is incomplete")

            generated_values[str(name)] = float(
                random.randint(int(minimum), int(maximum)))

    template = question.get("question_text", "")
    rendered_question_text = _render_formula_question_text(
        template, generated_values)
    expected_answer = _evaluate_formula_expression(
        str(question.get("formula_expression", "")), generated_values
    )

    return {
        "question_text": rendered_question_text,
        "type": "formula",
        "options": [],
        "expected_answer": expected_answer,
        "generated_values": generated_values,
    }


@router.get("/quizzes/", response_model=List[schemas.Quiz])
async def get_quizzes(db: AsyncIOMotorClient = Depends(get_db)):
    quizzes = await db.quizzes.find().to_list(1000)
    for quiz in quizzes:
        quiz["_id"] = str(quiz["_id"])
    return quizzes


@router.get("/quizzes/{quiz_id}", response_model=schemas.Quiz)
async def get_quiz(quiz_id: str, db: AsyncIOMotorClient = Depends(get_db)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz["_id"] = str(quiz["_id"])
    return quiz


@router.get("/quizzes/{quiz_id}/play", response_model=schemas.QuizPlay)
async def get_quiz_for_play(
    quiz_id: str,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db),
):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions_for_play = []
    grading_key = []

    for question_index, question in enumerate(quiz.get("questions", [])):
        question_type = question.get("type", "multiplechoice")

        if question_type == "formula":
            try:
                generated = _build_formula_question_instance(question)
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid formula configuration at question {question_index + 1}: {exc}",
                ) from exc

            questions_for_play.append(
                {
                    "question_text": generated["question_text"],
                    "type": "formula",
                    "options": [],
                }
            )
            grading_key.append(
                {
                    "question_index": question_index,
                    "type": "formula",
                    "expected_answer": generated["expected_answer"],
                    "generated_values": generated["generated_values"],
                    "rendered_question_text": generated["question_text"],
                }
            )
            continue

        if question_type == "numeric":
            questions_for_play.append(
                {
                    "question_text": question.get("question_text", ""),
                    "type": "numeric",
                    "options": [],
                }
            )
            grading_key.append(
                {
                    "question_index": question_index,
                    "type": "numeric",
                    "expected_answer": question.get("numeric_answer"),
                }
            )
            continue

        question_options = question.get("options") or []
        questions_for_play.append(
            {
                "question_text": question.get("question_text", ""),
                "type": "multiplechoice",
                "options": [
                    {"option_text": option.get("option_text", "")}
                    for option in question_options
                ],
            }
        )
        grading_key.append(
            {
                "question_index": question_index,
                "type": "multiplechoice",
                "correct_options": [
                    index
                    for index, option in enumerate(question_options)
                    if option.get("is_correct")
                ],
            }
        )

    session_doc = {
        "quiz_id": quiz_id,
        "user_id": current_user.id,
        "created_at": datetime.utcnow(),
        "grading_key": grading_key,
    }
    session_result = await db.quiz_sessions.insert_one(session_doc)

    return {
        "session_id": str(session_result.inserted_id),
        "quiz_id": quiz_id,
        "title": quiz.get("title", ""),
        "description": quiz.get("description"),
        "time_limit": quiz.get("time_limit"),
        "difficulty": quiz.get("difficulty", "medium"),
        "questions": questions_for_play,
    }
