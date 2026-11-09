@echo off
echo ============================================================
echo Starting CampusX Marketplace Services
echo ============================================================
echo [1/3] Starting Backend API (Node.js on :5000)...
start "CampusX Backend (:5000)" cmd /k "cd backend && npm run dev"

echo [2/3] Starting ML & Analytics Service (FastAPI on :8000)...
start "CampusX ML Service (:8000)" cmd /k "cd ml-service && python -m uvicorn main:app --reload --port 8000"

echo [3/3] Starting React Frontend (Vite on :5173)...
start "CampusX Frontend (:5173)" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo Open your browser at: http://localhost:5173
echo ============================================================

