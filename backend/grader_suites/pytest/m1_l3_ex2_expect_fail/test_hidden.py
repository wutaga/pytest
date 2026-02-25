import ast
import types
from pathlib import Path

STUDENT_FILE = Path(__file__).resolve().parents[1] / "student_solution.py"


def _load_tree() -> ast.Module:
    source = STUDENT_FILE.read_text(encoding="utf-8")
    return ast.parse(source)


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


def _has_wrong_expectation_for_add_2_3(test_nodes: list[ast.stmt]) -> bool:
    for root in test_nodes:
        for node in ast.walk(root):
            if not isinstance(node, ast.Assert):
                continue
            test_expr = node.test
            if not isinstance(test_expr, ast.Compare):
                continue
            if len(test_expr.ops) != 1 or not isinstance(test_expr.ops[0], ast.Eq):
                continue
            if len(test_expr.comparators) != 1:
                continue

            left = test_expr.left
            right = test_expr.comparators[0]
            if _is_add_2_3_call(left) and isinstance(right, ast.Constant):
                return right.value != 5
            if _is_add_2_3_call(right) and isinstance(left, ast.Constant):
                return left.value != 5
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
        return False, "Не найдено test_* функций."

    for test_fn in test_functions:
        try:
            test_fn()
        except Exception as exc:
            return False, f"{test_fn.__name__}: {exc.__class__.__name__}: {exc}"
    return True, "ok"


def test_student_intentional_failure_case():
    tree = _load_tree()
    test_nodes = _extract_student_tests(tree)

    assert test_nodes, "Не найдено тестов. Добавьте функцию с именем test_*."
    assert _has_wrong_expectation_for_add_2_3(
        test_nodes
    ), "Нужен намеренно падающий кейс именно для add(2, 3) с неверным ожидаемым значением."

    passed_on_correct, details = _run_student_tests(test_nodes, lambda a, b: a + b)
    assert (
        not passed_on_correct
    ), (
        "В этом упражнении тест должен падать на корректной add, "
        "чтобы показать формат FAILED в pytest. "
        f"Сейчас тесты проходят. Детали: {details}"
    )
