"""
Pydantic models for request/response schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AnalyzeCommandRequest(BaseModel):
    """Schema for PowerShell command analysis request"""
    command: str = Field(..., description="PowerShell command to analyze", example="Get-Process")
    
    # Optional fields from frontend
    user_id: Optional[str] = Field(None, description="User ID (if authenticated)")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    country: Optional[str] = Field(None, description="Country name")
    city: Optional[str] = Field(None, description="City name")
    region: Optional[str] = Field(None, description="Region/state name")
    timezone: Optional[str] = Field(None, description="Timezone")
    search_type: Optional[str] = Field(None, description="Search type (WEB/API)")
    session_id: Optional[str] = Field(None, description="Session ID")
    

    

class CreateUserSessionRequest(BaseModel):
    """Schema for user session creation"""
    user_id: str = Field(..., description="User ID from authentication")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    country: Optional[str] = Field(None, description="Country name")
    city: Optional[str] = Field(None, description="City name")
    region: Optional[str] = Field(None, description="Region/state name")





class UpdateProfileRequest(BaseModel):
    """Schema for profile update"""
    username: Optional[str] = Field(None, description="Username")
    full_name: Optional[str] = Field(None, description="Full name")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")


# Response schemas
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


class CacheInfo(BaseModel):
    """Schema for cache information"""
    cached: bool
    cache_age_minutes: float


class AnalysisResult(BaseModel):
    """Schema for analysis result"""
    command: str
    is_malicious: bool
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
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "analysis": {
                    "command": "dump password reflection",
                    "is_malicious": True,
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
                            "max_match_allowed": 3,
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
    
    class Config:
        schema_extra = {
            "example": {
                "error": "Command is required and must be a string"
            }
        }


class RateLimitResponse(BaseModel):
    """Schema for rate limit response"""
    error: str
    rate_limit_info: Dict[str, Any]
    session_id: str
    message: str
    
    class Config:
        schema_extra = {
            "example": {
                "error": "Rate limit exceeded",
                "rate_limit_info": {
                    "current_count": 6,
                    "limit": 5,
                    "window_seconds": 60,
                    "seconds_until_reset": 45
                },
                "session_id": "session-uuid",
                "message": "You have made 6 searches. Please wait 45 seconds before trying again."
            }
        }
