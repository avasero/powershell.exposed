"""
Aplicação principal FastAPI - PowerShell.exposed API
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Criar aplicação FastAPI
app = FastAPI(
    title="PowerShell.exposed API",
    description="API para análise de comandos PowerShell",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://powershell-exposed.vercel.app",
        "https://powershell-exposed-git-main-gabriels-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rotas básicas
@app.get("/")
async def root():
    return JSONResponse({
        "message": "PowerShell.exposed API working",
        "status": "success",
        "version": "1.0.0"
    })

@app.get("/health")
async def health():
    return JSONResponse({
        "status": "healthy",
        "message": "API working on Vercel"
    })

# Análise básica sem dependências complexas
@app.post("/analyze-pcre2")
async def analyze_basic(request: Request):
    """Análise básica para Vercel"""
    try:
        body = await request.json()
        command = body.get("command", "")
        
        if not command:
            return JSONResponse({
                "error": "Command is required"
            }, status_code=400)
        
        # Análise muito básica
        return JSONResponse({
            "success": True,
            "analysis": {
                "command": command,
                "is_malicious": False,
                "risk_score": 0.0,
                "severity": "very_low",
                "signatures_detected": [],
                "tactics": [],
                "techniques": [],
                "message": "Basic analysis - full features in development"
            },
            "environment": "vercel-basic"
        })
        
    except Exception as e:
        return JSONResponse({
            "error": f"Analysis error: {str(e)}"
        }, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
