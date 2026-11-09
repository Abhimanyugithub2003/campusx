Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting CampusX Marketplace Services" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "[1/3] Starting Backend API (Node.js on :5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

Write-Host "[2/3] Starting ML & Analytics Service (FastAPI on :8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ml-service; python -m uvicorn main:app --reload --port 8000"

Write-Host "[3/3] Starting React Frontend (Vite on :5173)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "All services launched in dedicated PowerShell windows!" -ForegroundColor Green
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

