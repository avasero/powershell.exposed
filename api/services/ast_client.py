"""
AST Deobfuscation Service Client
Communicates with the PowerShell AST Docker container for deobfuscation
"""
import httpx
from typing import Optional, Dict, Any
from config.settings import (
    AST_SERVICE_URL,
    AST_SERVICE_TIMEOUT,
    AST_SERVICE_ENABLED,
    AST_API_KEY
)


class AstDeobfuscationError(Exception):
    """Custom exception for AST deobfuscation failures"""
    pass


class AstServiceClient:
    """
    Client for the PowerShell AST deobfuscation service.

    This client communicates with a separate Docker container running
    PowerShell 7 that performs AST-based deobfuscation without executing code.
    """

    def __init__(self):
        self.base_url = AST_SERVICE_URL
        self.timeout = AST_SERVICE_TIMEOUT
        self.enabled = AST_SERVICE_ENABLED
        self.api_key = AST_API_KEY
        self._client: Optional[httpx.AsyncClient] = None

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers including API key if configured"""
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with connection pooling"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout),
                limits=httpx.Limits(
                    max_connections=10,
                    max_keepalive_connections=5
                ),
                headers=self._get_headers()
            )
        return self._client

    async def close(self):
        """Close the HTTP client and release connections"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def health_check(self) -> bool:
        """
        Check if the AST service is healthy and available.

        Returns:
            bool: True if service is healthy, False otherwise
        """
        if not self.enabled:
            return False

        try:
            client = await self._get_client()
            response = await client.get("/health", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                return data.get("status") == "healthy"
            return False
        except Exception as e:
            print(f"[AST] Health check failed: {e}")
            return False

    async def deobfuscate(self, command: str) -> Dict[str, Any]:
        """
        Send a command to the AST service for deobfuscation.

        The AST service uses PowerShell's Parser.ParseInput() to safely
        analyze and deobfuscate the command without executing it.

        Args:
            command: The PowerShell command to deobfuscate

        Returns:
            Dict containing:
                - success: bool - Whether deobfuscation succeeded
                - deobfuscated: str | None - The deobfuscated command
                - original: str - The original command
                - iterations: int - Number of deobfuscation passes
                - techniques_found: list - Obfuscation techniques detected
                - is_fully_deobfuscated: bool - Whether any changes were made
                - error: str | None - Error message if failed
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "AST service is disabled",
                "deobfuscated": None,
                "original": command,
                "iterations": 0,
                "techniques_found": [],
                "is_fully_deobfuscated": False
            }

        try:
            client = await self._get_client()
            response = await client.post(
                "/deobfuscate",
                json={"command": command}
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    result = data.get("result", {})
                    return {
                        "success": True,
                        "deobfuscated": result.get("deobfuscated"),
                        "original": result.get("original", command),
                        "iterations": result.get("iterations", 0),
                        "techniques_found": result.get("techniques_found", []),
                        "is_fully_deobfuscated": result.get("is_fully_deobfuscated", False),
                        "transformations": result.get("transformations", []),
                        "error": None
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("error", "Unknown error from AST service"),
                        "deobfuscated": None,
                        "original": command,
                        "iterations": 0,
                        "techniques_found": [],
                        "is_fully_deobfuscated": False
                    }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "error": "AST service authentication failed",
                    "deobfuscated": None,
                    "original": command,
                    "iterations": 0,
                    "techniques_found": [],
                    "is_fully_deobfuscated": False
                }
            elif response.status_code == 400:
                data = response.json()
                return {
                    "success": False,
                    "error": data.get("error", "Invalid request to AST service"),
                    "deobfuscated": None,
                    "original": command,
                    "iterations": 0,
                    "techniques_found": [],
                    "is_fully_deobfuscated": False
                }
            else:
                return {
                    "success": False,
                    "error": f"AST service returned status {response.status_code}",
                    "deobfuscated": None,
                    "original": command,
                    "iterations": 0,
                    "techniques_found": [],
                    "is_fully_deobfuscated": False
                }

        except httpx.TimeoutException:
            print(f"[AST] Deobfuscation timed out after {self.timeout}s")
            return {
                "success": False,
                "error": "AST service timeout",
                "deobfuscated": None,
                "original": command,
                "iterations": 0,
                "techniques_found": [],
                "is_fully_deobfuscated": False
            }
        except httpx.ConnectError as e:
            print(f"[AST] Connection error: {e}")
            return {
                "success": False,
                "error": "Cannot connect to AST service",
                "deobfuscated": None,
                "original": command,
                "iterations": 0,
                "techniques_found": [],
                "is_fully_deobfuscated": False
            }
        except Exception as e:
            print(f"[AST] Unexpected error: {e}")
            return {
                "success": False,
                "error": str(e),
                "deobfuscated": None,
                "original": command,
                "iterations": 0,
                "techniques_found": [],
                "is_fully_deobfuscated": False
            }

    async def analyze_ast(self, command: str) -> Dict[str, Any]:
        """
        Get raw AST analysis for a command without deobfuscation.

        This returns detailed information about the AST structure,
        useful for understanding the command's composition.

        Args:
            command: The PowerShell command to analyze

        Returns:
            Dict containing AST analysis or error information
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "AST service is disabled"
            }

        try:
            client = await self._get_client()
            response = await client.post(
                "/analyze-ast",
                json={"command": command}
            )

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                return {
                    "success": False,
                    "error": "AST service authentication failed"
                }
            else:
                return {
                    "success": False,
                    "error": f"AST service returned status {response.status_code}"
                }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "AST service timeout"
            }
        except httpx.ConnectError:
            return {
                "success": False,
                "error": "Cannot connect to AST service"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def batch_deobfuscate(self, commands: list) -> Dict[str, Any]:
        """
        Deobfuscate multiple commands in a single request.

        Args:
            commands: List of PowerShell commands to deobfuscate

        Returns:
            Dict containing results for each command
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "AST service is disabled",
                "results": []
            }

        try:
            client = await self._get_client()
            response = await client.post(
                "/deobfuscate/batch",
                json={"commands": commands}
            )

            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "success": False,
                    "error": f"AST service returned status {response.status_code}",
                    "results": []
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": []
            }


# Singleton instance for use across the application
ast_client = AstServiceClient()


async def get_ast_client() -> AstServiceClient:
    """
    Dependency injection function for FastAPI.

    Usage:
        @app.get("/endpoint")
        async def endpoint(ast: AstServiceClient = Depends(get_ast_client)):
            result = await ast.deobfuscate(command)
    """
    return ast_client
