"""
AI Service for generating PowerShell command overviews using OpenAI
"""
import asyncio
from typing import Optional, Dict, Any
from openai import AsyncOpenAI
from config.settings import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_MAX_TOKENS,
    OPENAI_TIMEOUT
)


SYSTEM_PROMPT = """You are a cybersecurity expert analyzing PowerShell commands. Your task is to provide a clear, plain-English explanation of what the command does and why it might be considered malicious or benign.

Guidelines:
- Be concise but thorough (2-4 sentences)
- Explain the command's purpose in simple terms
- Highlight any suspicious or malicious behaviors
- If the command is benign, explain why it's safe
- Use technical terms only when necessary, and explain them briefly
- Focus on the security implications"""


def is_ai_service_available() -> bool:
    """
    Check if the AI service is available (API key is configured)
    """
    return bool(OPENAI_API_KEY)


async def generate_ai_overview(
    command: str,
    analysis_result: Dict[str, Any]
) -> Optional[str]:
    """
    Generate an AI-powered overview of a PowerShell command

    Args:
        command: The PowerShell command being analyzed
        analysis_result: The analysis results including detected signatures

    Returns:
        A plain-English explanation of the command, or None if generation fails
    """
    if not is_ai_service_available():
        return None

    try:
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        # Build context from analysis results
        risk_score = analysis_result.get("total_score", 0)
        severity = analysis_result.get("severity", "unknown")
        detected_signatures = analysis_result.get("detected_signatures", [])

        # Format detected indicators for context
        indicators_text = ""
        if detected_signatures:
            indicator_names = [sig.get("name", "Unknown") for sig in detected_signatures[:5]]
            indicators_text = f"\nDetected indicators: {', '.join(indicator_names)}"

        # Check for decoded commands
        decoded_info = ""
        if analysis_result.get("decoded_command"):
            decoded_info = "\nNote: This command contains encoded content that was decoded for analysis."

        user_message = f"""Analyze this PowerShell command and explain what it does:

Command: {command}

Analysis Results:
- Risk Score: {risk_score}
- Severity: {severity}{indicators_text}{decoded_info}

Provide a brief, plain-English explanation of what this command does and why it received this risk assessment."""

        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=OPENAI_MAX_TOKENS,
                temperature=0.3
            ),
            timeout=OPENAI_TIMEOUT
        )

        if response.choices and response.choices[0].message.content:
            return response.choices[0].message.content.strip()

        return None

    except asyncio.TimeoutError:
        print("[AI Service] Request timed out")
        return None
    except Exception as error:
        print(f"[AI Service] Error generating overview: {error}")
        return None
