from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(
    title="PowerShell.exposed API",
    description="API para análise de comandos PowerShell",
    version="1.0.0"
)

@app.get("/")
async def root():
    return JSONResponse({
        "message": "Fast api working",
        "status": "success"
    })

@app.get("/health")
async def health_check():
    return JSONResponse({
        "status": "healthy",
        "message": "Fast api working"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
