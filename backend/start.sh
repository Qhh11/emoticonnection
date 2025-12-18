#!/bin/bash
# Startup script for EmotiConnect Backend
# Ensures the correct virtual environment is used

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starting EmotiConnect Backend..."
echo "📂 Working Directory: $(pwd)"

# Check if .venv exists
if [ ! -d ".venv" ]; then
    echo "❌ Error: Virtual environment (.venv) not found!"
    echo "Please run: python3 -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

# Run uvicorn using the explicit path to the venv python
# This avoids any confusion with global/conda python versions
echo "🐍 Using Python: $(./.venv/bin/python --version)"
echo "🔌 Starting Uvicorn..."

./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
