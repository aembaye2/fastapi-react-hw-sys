import ast
import re
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Literal


def _strip_markdown_code_fence(code: str) -> str:
    value = (code or "").strip()
    if not value.startswith("```"):
        return value

    lines = value.splitlines()
    if len(lines) >= 2 and lines[0].startswith("```") and lines[-1].strip() == "```":
        body = "\n".join(lines[1:-1])
        return body.strip()

    return value


def _extract_generator_variable_names(script_tree: ast.AST) -> set[str]:
    names: set[str] = set()
    if not isinstance(script_tree, ast.Module):
        return names

    for statement in script_tree.body:
        if isinstance(statement, ast.Assign):
            for target in statement.targets:
                if isinstance(target, ast.Name):
                    names.add(target.id)
    return names


def _normalize_formula_expression(expression: str) -> str:
    normalized = str(expression or "").strip()
    normalized = normalized.replace("\\cdot", "*")
    normalized = normalized.replace("\\times", "*")
    normalized = normalized.replace("×", "*")
    normalized = normalized.replace("÷", "/")
    normalized = normalized.replace("^", "**")
    return normalized


class OptionBase(BaseModel):
    option_text: str = Field(..., min_length=1,
                             description="The text of the option.")
    is_correct: bool = Field(
        default=False, description="Whether this option is the correct answer.")


class FormulaVariable(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        pattern=r"^[A-Za-z_][A-Za-z0-9_]*$",
        description="Variable name used in the template and expression, e.g. a or num1."
    )
    min_value: int = Field(..., description="Minimum generated integer value.")
    max_value: int = Field(..., description="Maximum generated integer value.")

    @model_validator(mode="after")
    def validate_range(self):
        if self.max_value < self.min_value:
            raise ValueError("formula variable max_value must be >= min_value")
        return self


class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1,
                               description="The text of the question.")
    type: Literal["multiplechoice", "numeric", "formula"] = Field(
        default="multiplechoice",
        description="Question type: multiplechoice, numeric, or formula."
    )
    options: Optional[List[OptionBase]] = Field(
        default=None,
        description="A list of possible answers for multiplechoice questions."
    )
    numeric_answer: Optional[float] = Field(
        default=None,
        description="Expected numeric answer when type is numeric."
    )
    formula_expression: Optional[str] = Field(
        default=None,
        description="Math expression to evaluate, e.g. 'a + b'."
    )
    formula_variables: Optional[List[FormulaVariable]] = Field(
        default=None,
        description="Variable generation rules for formula questions."
    )
    formula_generator_code: Optional[str] = Field(
        default=None,
        description="Optional Python-like code to generate formula variables safely."
    )

    @model_validator(mode="after")
    def validate_question_by_type(self):
        if self.type == "multiplechoice":
            if not self.options or len(self.options) < 2:
                raise ValueError(
                    "multiplechoice questions require at least two options")
            if not any(option.is_correct for option in self.options):
                raise ValueError(
                    "multiplechoice questions require at least one correct option")
        elif self.type == "numeric":
            if self.numeric_answer is None:
                raise ValueError("numeric questions require a numeric_answer")
        elif self.type == "formula":
            normalized_expression = _normalize_formula_expression(
                self.formula_expression or "")
            self.formula_expression = normalized_expression

            if not normalized_expression:
                raise ValueError(
                    "formula questions require a formula_expression")

            has_generator_code = bool(
                self.formula_generator_code and self.formula_generator_code.strip())
            has_formula_variables = bool(
                self.formula_variables and len(self.formula_variables) > 0)

            if not has_generator_code and not has_formula_variables:
                raise ValueError(
                    "formula questions require either formula_generator_code or at least one formula variable")

            if has_generator_code:
                normalized_generator_code = _strip_markdown_code_fence(
                    self.formula_generator_code or "")
                try:
                    script_tree = ast.parse(
                        normalized_generator_code, mode="exec")
                except SyntaxError as exc:
                    raise ValueError(
                        "formula_generator_code must be valid Python syntax") from exc

                allowed_statement_nodes = (
                    ast.Module,
                    ast.Import,
                    ast.ImportFrom,
                    ast.Assign,
                    ast.Expr,
                )
                for node in script_tree.body:
                    if not isinstance(node, allowed_statement_nodes):
                        raise ValueError(
                            "formula_generator_code only supports import, assignment, and expression statements")

                for node in ast.walk(script_tree):
                    if isinstance(node, (ast.For, ast.While, ast.If, ast.With, ast.Try, ast.FunctionDef, ast.ClassDef, ast.Lambda, ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp, ast.Await, ast.Yield, ast.Delete, ast.Global, ast.Nonlocal)):
                        raise ValueError(
                            "formula_generator_code contains unsupported syntax")

                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            if alias.name not in {"random", "math"}:
                                raise ValueError(
                                    "formula_generator_code only allows importing random or math")

                    if isinstance(node, ast.ImportFrom):
                        if node.module not in {"random", "math"}:
                            raise ValueError(
                                "formula_generator_code only allows importing from random or math")

                    if isinstance(node, ast.Assign):
                        for target in node.targets:
                            if not isinstance(target, ast.Name):
                                raise ValueError(
                                    "formula_generator_code only allows assignment to simple variable names")

            variable_names = {
                variable.name for variable in (self.formula_variables or [])}
            if has_generator_code:
                variable_names = variable_names.union(
                    _extract_generator_variable_names(script_tree))

            placeholders = set(
                re.findall(r"\{([A-Za-z_][A-Za-z0-9_]*)\}",
                           self.question_text or "")
            )
            missing_placeholders = placeholders - variable_names
            if missing_placeholders:
                raise ValueError(
                    f"formula question_text contains unknown placeholders: {sorted(missing_placeholders)}")

            try:
                expression_tree = ast.parse(
                    normalized_expression, mode="eval")
            except SyntaxError as exc:
                raise ValueError(
                    "formula_expression must be a valid expression") from exc

            expression_names = {
                node.id for node in ast.walk(expression_tree) if isinstance(node, ast.Name)
            }
            if not has_generator_code:
                missing_expression_vars = expression_names - variable_names
                if missing_expression_vars:
                    raise ValueError(
                        f"formula_expression contains unknown variables: {sorted(missing_expression_vars)}")

            allowed_nodes = (
                ast.Expression,
                ast.BinOp,
                ast.UnaryOp,
                ast.Add,
                ast.Sub,
                ast.Mult,
                ast.Div,
                ast.FloorDiv,
                ast.Mod,
                ast.Pow,
                ast.USub,
                ast.UAdd,
                ast.Name,
                ast.Load,
                ast.Constant,
            )
            for node in ast.walk(expression_tree):
                if not isinstance(node, allowed_nodes):
                    raise ValueError(
                        "formula_expression contains unsupported syntax")
        return self


class QuestionCreate(QuestionBase):
    pass


class Question(QuestionBase):
    id: str = Field(..., alias="_id",
                    description="The unique identifier of the question.")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str
        }
    }
