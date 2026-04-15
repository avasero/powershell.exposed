"""
RunPod LLM Deobfuscation Client
Uses GPU-hosted Qwen model for PowerShell deobfuscation via RunPod serverless.

Cold-start resilience:
  - submit_job()  → returns job_id immediately (store in DB before polling)
  - poll_job()    → adaptive intervals, up to _MAX_WAIT seconds
  - deobfuscate() → convenience wrapper: submit + poll in one call
"""
import asyncio
import time
import httpx
from typing import Optional, Dict, Any, Tuple

from config.settings import RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, RUNPOD_ENABLED


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

# Adaptive polling schedule for cold-start resilience
# (elapsed_seconds_threshold, interval_seconds)
_POLL_SCHEDULE = [
    (60,  5),   # 0–60s  : every 5s  — catches warm workers
    (300, 15),  # 60–300s: every 15s — handles typical cold starts (~2–4 min)
    (600, 30),  # 300–600s: every 30s — handles slow cold starts
]
_MAX_WAIT = 600.0   # 10-minute hard cap


class RunPodClient:
    _BASE_URL = "https://api.runpod.ai/v2"

    def __init__(self):
        self.api_key = RUNPOD_API_KEY
        self.endpoint_id = RUNPOD_ENDPOINT_ID
        self.enabled = RUNPOD_ENABLED

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def submit_job(self, command: str) -> Tuple[Optional[str], Optional[Dict]]:
        """
        Submit a deobfuscation job and return (job_id, error_dict).
        Does NOT poll — caller must call poll_job() separately.
        Separating submission from polling allows the job_id to be
        persisted in the DB before polling starts.
        """
        if not self.enabled or not self.api_key or not self.endpoint_id:
            return None, self._error(command, "RunPod client is disabled or not configured")

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

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self._BASE_URL}/{self.endpoint_id}/run",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                job = resp.json()

            job_id = job.get("id")
            if not job_id:
                return None, self._error(command, f"No job ID returned: {job}")

            print(f"[RUNPOD] Job submitted: {job_id}")
            return job_id, None

        except httpx.HTTPStatusError as e:
            msg = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            print(f"[RUNPOD] Submit error: {msg}")
            return None, self._error(command, msg)
        except Exception as e:
            print(f"[RUNPOD] Submit unexpected error: {e}")
            return None, self._error(command, str(e))

    async def poll_job(self, job_id: str, original_command: str) -> Dict[str, Any]:
        """
        Poll a previously submitted job until completion or _MAX_WAIT.
        Uses adaptive intervals to handle cold starts efficiently.
        Returns the same dict shape as deobfuscate().
        """
        print(f"[RUNPOD] Polling job {job_id} (max {_MAX_WAIT}s, adaptive intervals)")
        raw_output = await self._poll(job_id)
        if raw_output is None:
            return self._error(original_command, f"RunPod job {job_id} timed out or failed")
        return self._parse(raw_output, original_command)

    async def deobfuscate(self, command: str) -> Dict[str, Any]:
        """
        Convenience wrapper: submit + poll in one call.
        Also returns runpod_job_id in the result dict so callers
        can persist it before the poll completes if needed.
        """
        job_id, err = await self.submit_job(command)
        if err is not None:
            return err

        result = await self.poll_job(job_id, command)
        result["runpod_job_id"] = job_id
        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _poll(self, job_id: str) -> Optional[str]:
        """Adaptive-interval polling. Returns raw LLM text or None on failure."""
        start = time.monotonic()
        deadline = start + _MAX_WAIT

        async with httpx.AsyncClient(timeout=15.0) as client:
            while time.monotonic() < deadline:
                elapsed = time.monotonic() - start
                interval = self._interval_for(elapsed)
                await asyncio.sleep(interval)

                try:
                    resp = await client.get(
                        f"{self._BASE_URL}/{self.endpoint_id}/status/{job_id}",
                        headers=self._headers(),
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    status = data.get("status")

                    if status == "COMPLETED":
                        elapsed_total = time.monotonic() - start
                        print(f"[RUNPOD] Job {job_id} completed in {elapsed_total:.0f}s")
                        return self._extract_text(data.get("output"))
                    elif status in ("FAILED", "CANCELLED", "TIMED_OUT"):
                        print(f"[RUNPOD] Job {job_id} terminal status: {status}")
                        return None
                    # IN_QUEUE / IN_PROGRESS → cold start in progress, keep waiting

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        print(f"[RUNPOD] Job {job_id} not found (404) — treating as terminal")
                        return None
                    print(f"[RUNPOD] Poll HTTP error for {job_id}: {e}")
                except Exception as e:
                    print(f"[RUNPOD] Poll error for {job_id}: {e}")

        elapsed_total = time.monotonic() - start
        print(f"[RUNPOD] Job {job_id} timed out after {elapsed_total:.0f}s (cold start too slow?)")
        return None

    @staticmethod
    def _interval_for(elapsed: float) -> float:
        """Return the polling interval (seconds) based on how long we've been waiting."""
        prev_threshold = 0
        for threshold, interval in _POLL_SCHEDULE:
            if elapsed < threshold:
                return interval
            prev_threshold = threshold
        return _POLL_SCHEDULE[-1][1]

    @staticmethod
    def _extract_text(output) -> Optional[str]:
        """Extract assistant message content from various vLLM/RunPod output shapes."""
        if output is None:
            return None

        if isinstance(output, list):
            for item in output:
                if isinstance(item, dict):
                    text = RunPodClient._extract_text(item)
                    if text:
                        return text
            parts = [str(i) for i in output if isinstance(i, str)]
            return "\n".join(parts) if parts else None

        if isinstance(output, dict):
            choices = output.get("choices")
            if choices and isinstance(choices, list):
                first = choices[0]
                msg = first.get("message")
                if isinstance(msg, dict):
                    return msg.get("content")
                tokens = first.get("tokens")
                if tokens and isinstance(tokens, list):
                    return "".join(tokens)
                text = first.get("text")
                if text:
                    return text
            if "text" in output:
                return output["text"]
            if "content" in output:
                return output["content"]

        return str(output) if output else None

    @staticmethod
    def _parse(text: str, original: str) -> Dict[str, Any]:
        """Parse the structured LLM output into the deobfuscation result dict."""
        text = text.strip()
        deobfuscated = None
        techniques_found = []

        if "DEOBFUSCATED:" in text:
            after_header = text.split("DEOBFUSCATED:", 1)[1]
            if "TECHNIQUES:" in after_header:
                deobf_block = after_header.split("TECHNIQUES:", 1)[0]
                techs_line = after_header.split("TECHNIQUES:", 1)[1].strip().splitlines()[0]
            else:
                deobf_block = after_header
                techs_line = ""
            deobfuscated = deobf_block.strip()
            if techs_line and techs_line.lower() != "none":
                techniques_found = [t.strip() for t in techs_line.split(",") if t.strip()]
        else:
            deobfuscated = text

        changed = bool(deobfuscated) and deobfuscated != original
        return {
            "success": True,
            "deobfuscated": deobfuscated or original,
            "original": original,
            "iterations": 1,
            "techniques_found": techniques_found,
            "is_fully_deobfuscated": changed,
            "error": None,
        }

    @staticmethod
    def _error(command: str, msg: str) -> Dict[str, Any]:
        return {
            "success": False,
            "error": msg,
            "deobfuscated": None,
            "original": command,
            "iterations": 0,
            "techniques_found": [],
            "is_fully_deobfuscated": False,
        }


runpod_client = RunPodClient()
