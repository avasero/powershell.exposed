#!/usr/bin/env python3
"""
Complete fix and startup script
"""
import os
import sys
import shutil
import subprocess

def clear_cache():
    """Clear Python cache files"""
    print("🧹 Clearing Python cache...")
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            cache_dir = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(cache_dir)
                print(f"   ✅ Removed {cache_dir}")
            except Exception as e:
                print(f"   ❌ Error removing {cache_dir}: {e}")

def install_dependencies():
    """Install the correct dependencies"""
    print("📦 Installing dependencies...")
    try:
        # First, fix the httpx version conflict
        subprocess.run([sys.executable, "-m", "pip", "install", "httpx>=0.24.0,<0.25.0"], check=True)
        
        # Then install all requirements
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("   ✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Error installing dependencies: {e}")
        return False

def test_imports():
    """Test if all imports work correctly"""
    print("🔍 Testing imports...")
    try:
        from middleware.auth_middleware import auth_middleware
        from fastapi import FastAPI
        print("   ✅ All imports successful")
        return True
    except ImportError as e:
        print(f"   ❌ Import error: {e}")
        return False

def start_server():
    """Start the server"""
    print("🚀 Starting server...")
    try:
        import uvicorn
        from main_fixed import app
        
        print("📡 Server starting at: http://localhost:8000")
        print("🔍 Health check: http://localhost:8000/health")
        print("📖 API docs: http://localhost:8000/docs")
        print("⭐ Press Ctrl+C to stop")
        
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        return False

def main():
    """Main fix and start process"""
    print("🔧 PowerShell.exposed API - Fix and Start")
    print("=" * 50)
    
    # Step 1: Clear cache
    clear_cache()
    
    # Step 2: Install dependencies
    if not install_dependencies():
        print("❌ Failed to install dependencies. Please run manually:")
        print("   pip install httpx>=0.24.0,<0.25.0")
        print("   pip install -r requirements.txt")
        return
    
    # Step 3: Test imports
    if not test_imports():
        print("❌ Import test failed. Please check the error above.")
        return
    
    # Step 4: Start server
    print("\n🎯 Everything looks good! Starting server...")
    start_server()

if __name__ == "__main__":
    main()
