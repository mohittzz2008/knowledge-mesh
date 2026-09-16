"""Safe Subprocess Execution Sandbox for Python Code Lab Submissions."""

import sys
import time
import subprocess
from typing import Any


class SafeCodeExecutor:
    """Executes Python code safely in isolated subprocesses with timeout protection."""

    def execute_python_code(
        self,
        code: str,
        test_cases: list[dict[str, Any]],
        timeout_seconds: float = 3.0,
    ) -> dict[str, Any]:
        """Execute user python code against test cases using subprocess isolation (no unsafe exec/eval in API process)."""
        start_time = time.perf_counter()

        # Build test harness wrapper script
        harness_lines = [
            code,
            "\n# AUTOMATED TEST HARNESS",
            "import json, sys",
            "results = []",
        ]

        for idx, tc in enumerate(test_cases):
            tc_input = tc.get("input", "")
            tc_expected = tc.get("expected", "")
            func_call = tc.get("function_call", "inorder_traversal(root)")

            indented_input = "\n    ".join(tc_input.splitlines()) if tc_input else ""

            harness_lines.append(f"""
try:
    # Setup test input variables
    {indented_input}
    res = {func_call}
    actual_str = str(res)
    expected_str = str('{tc_expected}')
    passed = actual_str.strip() == expected_str.strip()
    results.append({{
        "test_case": {idx + 1},
        "passed": passed,
        "actual": actual_str,
        "expected": expected_str,
        "error": None,
    }})
except Exception as e:
    results.append({{
        "test_case": {idx + 1},
        "passed": False,
        "actual": "Error",
        "expected": str('{tc_expected}'),
        "error": str(e),
    }})
""")

        harness_lines.append("print('---TEST_HARNESS_RESULTS---')")
        harness_lines.append("print(json.dumps(results))")

        full_script = "\n".join(harness_lines)

        try:
            res = subprocess.run(
                [sys.executable, "-c", full_script],
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if res.returncode != 0:
                return {
                    "status": "error",
                    "stdout": res.stdout,
                    "stderr": res.stderr,
                    "execution_time_ms": elapsed_ms,
                    "passed_count": 0,
                    "total_tests": len(test_cases),
                    "test_results": [],
                    "error_message": res.stderr or "Runtime error during execution.",
                }

            stdout_text = res.stdout
            if "---TEST_HARNESS_RESULTS---" in stdout_text:
                parts = stdout_text.split("---TEST_HARNESS_RESULTS---")
                user_logs = parts[0].strip()
                json_part = parts[1].strip()

                import json
                parsed_results = json.loads(json_part)
                passed_cnt = sum(1 for r in parsed_results if r.get("passed"))
                all_passed = passed_cnt == len(test_cases)

                return {
                    "status": "passed" if all_passed else "failed",
                    "stdout": user_logs,
                    "stderr": res.stderr,
                    "execution_time_ms": elapsed_ms,
                    "passed_count": passed_cnt,
                    "total_tests": len(test_cases),
                    "test_results": parsed_results,
                    "error_message": None,
                }
            else:
                return {
                    "status": "error",
                    "stdout": res.stdout,
                    "stderr": res.stderr,
                    "execution_time_ms": elapsed_ms,
                    "passed_count": 0,
                    "total_tests": len(test_cases),
                    "test_results": [],
                    "error_message": "Invalid script output structure.",
                }

        except subprocess.TimeoutExpired:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "status": "timeout",
                "stdout": "",
                "stderr": f"Execution timed out after {timeout_seconds} seconds.",
                "execution_time_ms": elapsed_ms,
                "passed_count": 0,
                "total_tests": len(test_cases),
                "test_results": [],
                "error_message": f"Execution timed out after {timeout_seconds} seconds limit.",
            }
