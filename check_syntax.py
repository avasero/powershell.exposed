
import py_compile

try:
    py_compile.compile('api/services/plan_service.py', doraise=True)
    print("Syntax OK")
except Exception as e:
    print(f"Syntax Error: {e}")
