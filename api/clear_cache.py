#!/usr/bin/env python3
"""
Clear Python cache files and restart cleanly
"""
import os
import shutil
import sys

def clear_pycache():
    """Remove all __pycache__ directories"""
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            cache_dir = os.path.join(root, '__pycache__')
            print(f"Removing {cache_dir}")
            try:
                shutil.rmtree(cache_dir)
            except Exception as e:
                print(f"Error removing {cache_dir}: {e}")

def clear_pyc_files():
    """Remove all .pyc files"""
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.pyc'):
                pyc_file = os.path.join(root, file)
                print(f"Removing {pyc_file}")
                try:
                    os.remove(pyc_file)
                except Exception as e:
                    print(f"Error removing {pyc_file}: {e}")

if __name__ == "__main__":
    print("🧹 Clearing Python cache files...")
    clear_pycache()
    clear_pyc_files()
    print("✅ Cache cleared! You can now restart the server.")
