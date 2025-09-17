#!/usr/bin/env python3
"""
Test the middleware setup independently
"""
from fastapi import FastAPI, Request
from middleware.auth_middleware import auth_middleware

# Create a simple test app
app = FastAPI()

# Add only the auth middleware
app.middleware("http")(auth_middleware)

@app.get("/test")
async def test_endpoint(request: Request):
    """Test endpoint to verify middleware works"""
    return {
        "message": "Middleware test successful",
        "user_authenticated": getattr(request.state, 'is_authenticated', False),
        "user_id": getattr(request.state, 'user_id', None)
    }

if __name__ == "__main__":
    import uvicorn
    print("🧪 Testing middleware independently...")
    print("📡 Test server: http://localhost:8001/test")
    uvicorn.run(app, host="0.0.0.0", port=8001)
