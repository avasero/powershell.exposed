"""
Async Deobfuscation Queue Service

Decouples AST deobfuscation from the /evaluate request cycle.
Jobs are processed in the background with a concurrency limit,
allowing /evaluate to return immediately.
"""
import asyncio
import time
import regex
from typing import Dict, List, Optional
from dataclasses import dataclass, field

from services.ast_client import ast_client
from services.session_manager import get_supabase_client
from services.detectors import (
    process_command_for_evasion,
    detect_evasion,
    get_adjusted_score_and_severity,
)
from services.powershell_analyzer import (
    load_signatures_from_db,
    calculate_severity_and_risk,
)


@dataclass
class DeobfuscationJob:
    short_id: str
    command: str
    first_decoded: Optional[str] = None
    submitted_at: float = field(default_factory=time.time)


@dataclass
class DeobfuscationResult:
    status: str  # "processing" | "completed" | "failed"
    deobfuscated_command: Optional[str] = None
    deobfuscation_techniques: list = field(default_factory=list)
    new_signatures: list = field(default_factory=list)
    added_score: float = 0.0
    new_tactics: list = field(default_factory=list)
    new_techniques: list = field(default_factory=list)
    error: Optional[str] = None
    completed_at: Optional[float] = None
    created_at: float = field(default_factory=time.time)


class DeobfuscationQueue:
    def __init__(self, max_concurrent: int = 2, result_ttl: int = 3600):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._results: Dict[str, DeobfuscationResult] = {}
        self._result_ttl = result_ttl
        self._worker_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._worker_task = asyncio.create_task(self._worker())
        print("[DEOBFUSCATION_QUEUE] Background worker started")

    async def stop(self):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
        print("[DEOBFUSCATION_QUEUE] Background worker stopped")

    async def submit(self, job: DeobfuscationJob):
        self._results[job.short_id] = DeobfuscationResult(status="processing")
        try:
            self._queue.put_nowait(job)
            print(f"[DEOBFUSCATION_QUEUE] Job queued: {job.short_id} (queue size: {self._queue.qsize()})")
        except asyncio.QueueFull:
            print(f"[DEOBFUSCATION_QUEUE] Queue full, dropping job: {job.short_id}")
            self._results[job.short_id] = DeobfuscationResult(
                status="failed",
                error="Queue full, try again later",
                completed_at=time.time()
            )

    def get_status(self, short_id: str) -> Optional[DeobfuscationResult]:
        return self._results.get(short_id)

    async def run_inline(self, job: DeobfuscationJob) -> DeobfuscationResult:
        """Run deobfuscation synchronously (awaited) and return the result directly."""
        self._results[job.short_id] = DeobfuscationResult(status="processing")
        await self._process_job(job)
        return self._results.get(job.short_id, DeobfuscationResult(status="failed", error="No result"))

    async def _worker(self):
        while self._running:
            try:
                job = await asyncio.wait_for(self._queue.get(), timeout=5.0)
                asyncio.create_task(self._process_job(job))
            except asyncio.TimeoutError:
                self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[DEOBFUSCATION_QUEUE] Worker error: {e}")

    async def _process_job(self, job: DeobfuscationJob):
        async with self._semaphore:
            try:
                ast_deobfuscated = None
                ast_techniques = []

                ast_result = await ast_client.deobfuscate(job.command)
                if ast_result["success"] and ast_result.get("techniques_found"):
                    ast_deobfuscated = ast_result["deobfuscated"]
                    ast_techniques = ast_result.get("techniques_found", [])

                if job.first_decoded and job.first_decoded != job.command:
                    decoded_result = await ast_client.deobfuscate(job.first_decoded)
                    if decoded_result["success"] and decoded_result.get("techniques_found"):
                        decoded_deobfuscated = decoded_result["deobfuscated"]
                        if decoded_deobfuscated and decoded_deobfuscated != job.first_decoded:
                            for tech in decoded_result.get("techniques_found", []):
                                if tech not in ast_techniques:
                                    ast_techniques.append(tech)
                            if not ast_deobfuscated:
                                ast_deobfuscated = decoded_deobfuscated

                # Run signature matching on the deobfuscated content
                new_signatures, added_score, new_tactics, new_techniques = await self._match_deobfuscated_signatures(
                    job.short_id, job.command, ast_deobfuscated, ast_techniques
                )

                self._results[job.short_id] = DeobfuscationResult(
                    status="completed",
                    deobfuscated_command=ast_deobfuscated,
                    deobfuscation_techniques=ast_techniques,
                    new_signatures=new_signatures,
                    added_score=added_score,
                    new_tactics=new_tactics,
                    new_techniques=new_techniques,
                    completed_at=time.time()
                )

                await self._update_db(job.short_id, ast_deobfuscated, ast_techniques, new_signatures, added_score)
                print(f"[DEOBFUSCATION_QUEUE] Job completed: {job.short_id} "
                      f"(techniques: {ast_techniques}, new sigs: {len(new_signatures)}, added score: {added_score})")

            except Exception as e:
                print(f"[DEOBFUSCATION_QUEUE] Job failed: {job.short_id} - {e}")
                self._results[job.short_id] = DeobfuscationResult(
                    status="failed",
                    error=str(e),
                    completed_at=time.time()
                )

    async def _match_deobfuscated_signatures(
        self,
        short_id: str,
        original_command: str,
        deobfuscated: Optional[str],
        ast_techniques: list
    ) -> tuple:
        """Run signature matching on deobfuscated content and return new findings."""
        new_signatures = []
        added_score = 0.0
        tactics_set = set()
        techniques_set = set()

        if not deobfuscated and not ast_techniques:
            return new_signatures, added_score, [], []

        try:
            # Load current signatures from DB
            signatures = await load_signatures_from_db()
            if not signatures:
                return new_signatures, added_score, [], []

            # Load existing analysis to know which signatures were already detected
            supabase = get_supabase_client()
            db_response = supabase.table('powershell_analyses') \
                .select('signatures_detected') \
                .eq('short_id', short_id) \
                .single() \
                .execute()

            existing_sig_names = set()
            if db_response.data:
                for sig in (db_response.data.get("signatures_detected") or []):
                    existing_sig_names.add(sig.get("name"))

            # Inject "Heavily Obfuscated Command" if techniques were found
            if ast_techniques and "Heavily Obfuscated Command" not in existing_sig_names:
                heavily_obfuscated_sig = next(
                    (sig for sig in signatures if sig.get("name") == "Heavily Obfuscated Command"), None
                )
                if heavily_obfuscated_sig:
                    sig_entry = {
                        "name": "Heavily Obfuscated Command",
                        "description": f"AST deobfuscation detected {len(ast_techniques)} obfuscation technique(s)",
                        "severity": heavily_obfuscated_sig["severity"],
                        "base_score": heavily_obfuscated_sig["score"],
                        "matches_found": 1,
                        "total_score": heavily_obfuscated_sig["score"],
                        "max_match_allowed": 1,
                        "pattern": "__DEOBFUSCATION_CHECK__",
                        "matches_details": [{
                            "matched_text": f"{len(ast_techniques)} obfuscation technique(s) detected",
                            "position": {"start": 0, "end": len(original_command)},
                            "match_number": 1,
                            "matched_in": "deobfuscated"
                        }],
                        "tactics": heavily_obfuscated_sig.get("tactics", ["Defense Evasion"]),
                        "techniques": heavily_obfuscated_sig.get("techniques", ["T1027", "T1027.010", "T1140"]),
                        "reference": heavily_obfuscated_sig.get("reference", []),
                        "link": heavily_obfuscated_sig.get("link"),
                        "is_premium_indicator": False,
                        "indicator_type": heavily_obfuscated_sig.get("indicator_type", "community"),
                        "found_in_decoded": False
                    }
                    new_signatures.append(sig_entry)
                    added_score += heavily_obfuscated_sig["score"]
                    tactics_set.update(heavily_obfuscated_sig.get("tactics", []))
                    techniques_set.update(heavily_obfuscated_sig.get("techniques", []))

            # Match signatures against the deobfuscated command
            if deobfuscated:
                skip_signatures = {
                    "Obfuscation Detected", "Encoded Command Detected",
                    "Double Encoded Command Detected", "Heavily Obfuscated Command",
                    "Long base64 strings"
                }

                for signature in signatures:
                    sig_name = signature.get("name")
                    if sig_name in skip_signatures:
                        continue
                    if sig_name in existing_sig_names:
                        continue

                    all_matches = []
                    matched_pattern = None
                    matched_via_sanitization = False

                    cmd_to_check, was_sanitized, matches_before_count = process_command_for_evasion(
                        deobfuscated, signature
                    )

                    for pattern in signature["patterns"]:
                        try:
                            compiled = regex.compile(pattern, regex.IGNORECASE)
                            pattern_matches = list(compiled.finditer(cmd_to_check))
                            if pattern_matches:
                                if matched_pattern is None:
                                    matched_pattern = pattern
                                if detect_evasion(was_sanitized, matches_before_count, len(pattern_matches)):
                                    matched_via_sanitization = True
                                for m in pattern_matches:
                                    all_matches.append({
                                        "matched_text": m.group(0),
                                        "position": {"start": m.start(), "end": m.end()},
                                        "matched_in": "deobfuscated"
                                    })
                        except regex.error:
                            continue

                    # Deduplicate
                    unique_matches = []
                    seen = set()
                    for mi in all_matches:
                        key = (mi["position"]["start"], mi["position"]["end"], mi["matched_text"])
                        if key not in seen:
                            seen.add(key)
                            unique_matches.append(mi)

                    matches_found = min(len(unique_matches), signature["max_match"])
                    if matches_found > 0:
                        sig_score, adjusted_severity, san_applied = get_adjusted_score_and_severity(
                            signature, matched_via_sanitization
                        )
                        sig_entry = {
                            "name": sig_name,
                            "description": signature["description"],
                            "severity": adjusted_severity,
                            "base_score": signature["score"],
                            "matches_found": matches_found,
                            "total_score": sig_score,
                            "max_match_allowed": signature["max_match"],
                            "pattern": matched_pattern or (signature["patterns"][0] if signature["patterns"] else ""),
                            "matches_details": [
                                {
                                    "matched_text": mi["matched_text"],
                                    "position": mi["position"],
                                    "match_number": i + 1,
                                    "matched_in": "deobfuscated"
                                }
                                for i, mi in enumerate(unique_matches[:matches_found])
                            ],
                            "tactics": signature["tactics"],
                            "techniques": signature["techniques"],
                            "reference": signature.get("reference", []),
                            "link": signature.get("link"),
                            "is_premium_indicator": signature.get("is_premium_indicator", False),
                            "indicator_type": signature.get("indicator_type", "community"),
                            "found_in_decoded": True,
                            "san_score_applied": san_applied,
                            "san_score": signature.get("san_score") if san_applied else None
                        }
                        new_signatures.append(sig_entry)
                        added_score += sig_score
                        tactics_set.update(signature["tactics"])
                        techniques_set.update(signature["techniques"])

        except Exception as e:
            print(f"[DEOBFUSCATION_QUEUE] Signature matching error for {short_id}: {e}")

        return new_signatures, added_score, list(tactics_set), list(techniques_set)

    async def _update_db(self, short_id: str, deobfuscated: Optional[str],
                         techniques: list, new_signatures: list, added_score: float):
        try:
            supabase = get_supabase_client()

            # Fetch current record
            current = supabase.table('powershell_analyses') \
                .select('signatures_detected, risk_score, severity, tactics, techniques') \
                .eq('short_id', short_id) \
                .single() \
                .execute()

            if not current.data:
                print(f"[DEOBFUSCATION_QUEUE] DB record not found for {short_id}")
                return

            update_data = {}

            if deobfuscated:
                max_len = 100000
                if len(deobfuscated) > max_len:
                    deobfuscated = deobfuscated[:max_len] + "... [TRUNCATED]"
                update_data["deobfuscated_command"] = deobfuscated

            if techniques:
                update_data["deobfuscation_techniques"] = techniques

            # Merge new signatures into existing
            if new_signatures:
                existing_sigs = current.data.get("signatures_detected") or []
                merged_sigs = existing_sigs + new_signatures
                update_data["signatures_detected"] = merged_sigs

                # Update score
                old_score = float(current.data.get("risk_score", 0))
                new_score = min(round(old_score + added_score, 1), 999.9)
                update_data["risk_score"] = new_score
                update_data["severity"] = calculate_severity_and_risk(new_score)

                # Merge tactics and techniques
                existing_tactics = set(current.data.get("tactics") or [])
                existing_techniques = set(current.data.get("techniques") or [])
                for sig in new_signatures:
                    existing_tactics.update(sig.get("tactics", []))
                    existing_techniques.update(sig.get("techniques", []))
                update_data["tactics"] = list(existing_tactics)
                update_data["techniques"] = list(existing_techniques)

            if update_data:
                supabase.table('powershell_analyses').update(update_data).eq('short_id', short_id).execute()

        except Exception as e:
            print(f"[DEOBFUSCATION_QUEUE] DB update failed for {short_id}: {e}")

    def _cleanup_expired(self):
        now = time.time()
        expired = [
            sid for sid, result in self._results.items()
            if result.completed_at and (now - result.completed_at) > self._result_ttl
        ]
        for sid in expired:
            del self._results[sid]
        if expired:
            print(f"[DEOBFUSCATION_QUEUE] Cleaned up {len(expired)} expired results")


deobfuscation_queue = DeobfuscationQueue(max_concurrent=2, result_ttl=3600)
