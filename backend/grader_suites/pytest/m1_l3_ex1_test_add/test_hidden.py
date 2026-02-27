import ast
import types
from pathlib import Path

import pytest

STUDENT_FILE = Path(__file__).resolve().parents[1] / "student_solution.py"


def _load_tree() -> ast.Module:
    source = STUDENT_FILE.read_text(encoding="utf-8")
    try:
        return ast.parse(source)
    except SyntaxError as exc:
        pytest.fail(f"Синтаксическая ошибка: {exc.msg} (строка {exc.lineno})")


def _extract_student_tests(tree: ast.Module) -> list[ast.stmt]:
    test_nodes: list[ast.stmt] = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            test_nodes.append(node)
        elif isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
            test_nodes.append(node)
        elif isinstance(node, ast.ClassDef) and node.name.startswith("Test"):
            test_nodes.append(node)
    return test_nodes


def _is_int_constant(node: ast.AST, value: int) -> bool:
    return isinstance(node, ast.Constant) and node.value == value


def _is_add_2_3_call(node: ast.AST) -> bool:
    if not isinstance(node, ast.Call):
        return False
    if not isinstance(node.func, ast.Name) or node.func.id != "add":
        return False
    if len(node.args) != 2:
        return False
    return _is_int_constant(node.args[0], 2) and _is_int_constant(node.args[1], 3)


def _compare_matches_required_case(
    compare: ast.Compare, aliases_for_add_2_3: set[str]
) -> bool:
    if len(compare.ops) != 1 or not isinstance(compare.ops[0], ast.Eq):
        return False
    if len(compare.comparators) != 1:
        return False

    left = compare.left
    right = compare.comparators[0]

    if _is_add_2_3_call(left) and _is_int_constant(right, 5):
        return True
    if _is_add_2_3_call(right) and _is_int_constant(left, 5):
        return True

    if isinstance(left, ast.Name) and left.id in aliases_for_add_2_3 and _is_int_constant(right, 5):
        return True
    if isinstance(right, ast.Name) and right.id in aliases_for_add_2_3 and _is_int_constant(left, 5):
        return True

    return False


def _contains_required_case(test_nodes: list[ast.stmt]) -> bool:
    for root in test_nodes:
        if isinstance(root, ast.FunctionDef):
            aliases_for_add_2_3: set[str] = set()
            for stmt in root.body:
                if (
                    isinstance(stmt, ast.Assign)
                    and len(stmt.targets) == 1
                    and isinstance(stmt.targets[0], ast.Name)
                    and _is_add_2_3_call(stmt.value)
                ):
                    aliases_for_add_2_3.add(stmt.targets[0].id)

                if (
                    isinstance(stmt, ast.Assert)
                    and isinstance(stmt.test, ast.Compare)
                    and _compare_matches_required_case(stmt.test, aliases_for_add_2_3)
                ):
                    return True

        elif isinstance(root, ast.ClassDef):
            for item in root.body:
                if isinstance(item, ast.FunctionDef):
                    aliases_for_add_2_3: set[str] = set()
                    for stmt in item.body:
                        if (
                            isinstance(stmt, ast.Assign)
                            and len(stmt.targets) == 1
                            and isinstance(stmt.targets[0], ast.Name)
                            and _is_add_2_3_call(stmt.value)
                        ):
                            aliases_for_add_2_3.add(stmt.targets[0].id)

                        if (
                            isinstance(stmt, ast.Assert)
                            and isinstance(stmt.test, ast.Compare)
                            and _compare_matches_required_case(stmt.test, aliases_for_add_2_3)
                        ):
                            return True

    return False


def _run_student_tests(test_nodes: list[ast.stmt], add_impl) -> tuple[bool, str]:
    module = types.ModuleType("student_tests")
    module.__dict__["add"] = add_impl
    module.__dict__["__name__"] = "student_tests"

    test_module_ast = ast.Module(body=test_nodes, type_ignores=[])
    compiled = compile(
        ast.fix_missing_locations(test_module_ast),
        filename="<student_tests>",
        mode="exec",
    )
    exec(compiled, module.__dict__)

    test_functions = [
        obj
        for name, obj in module.__dict__.items()
        if name.startswith("test_") and callable(obj)
    ]
    if not test_functions:
        return False, "Не найдено тестовых функций вида test_*."

    for test_fn in test_functions:
        try:
            test_fn()
        except Exception as exc:
            return False, f"{test_fn.__name__}: {exc.__class__.__name__}: {exc}"
    return True, "ok"


def test_student_test_quality_for_add():
    tree = _load_tree()
    test_nodes = _extract_student_tests(tree)

    assert test_nodes, "Не найдено тестов. Добавьте функцию с именем test_*."
    assert _contains_required_case(
        test_nodes
    ), "В этом задании нужен явный кейс: add(2, 3) == 5."

    ok_on_correct, details = _run_student_tests(test_nodes, lambda a, b: a + b)
    assert (
        ok_on_correct
    ), f"Тест не принят: падает на корректной функции add. Детали: {details}"

    escaped_bugs = []
    for bug_name, bug_impl in [
        ("a - b", lambda a, b: a - b),
        ("a * b", lambda a, b: a * b),
    ]:
        passed_on_bug, _ = _run_student_tests(test_nodes, bug_impl)
        if passed_on_bug:
            escaped_bugs.append(bug_name)

    assert (
        not escaped_bugs
    ), f"Тест слишком слабый: он не ловит ошибочные реализации add ({', '.join(escaped_bugs)})."
