#!/bin/bash

# Start Backend Server Script with Auto-Reload

echo "=========================================="
echo "  Claude Workflow Manager - Backend"
echo "=========================================="
echo ""
echo "Starting FastAPI backend server with auto-reload..."
echo "The server will automatically restart when you make changes to the code."
echo ""

cd backend
python3 app.py
