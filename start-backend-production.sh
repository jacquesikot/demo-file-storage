#!/bin/bash

# Start Backend Server Script for Production (No Auto-Reload)

echo "=========================================="
echo "  Claude Workflow Manager - Backend"
echo "  PRODUCTION MODE"
echo "=========================================="
echo ""
echo "Starting FastAPI backend server in production mode..."
echo "Auto-reload is DISABLED for better performance."
echo ""

cd backend

# Use uvicorn directly with multiple workers for production
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
