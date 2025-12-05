# Service Health Check Script

Write-Host "=== PlotTwist Arena - Service Status ===" -ForegroundColor Cyan
Write-Host ""

# Check ports
$ports = @{
    "Frontend" = 5173
    "Backend" = 3001
    "Model Server" = 8001
    "PostgreSQL" = 5432
}

foreach ($service in $ports.GetEnumerator()) {
    $port = $service.Value
    $name = $service.Key

    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    if ($connection) {
        Write-Host "✓ $name (port $port) - " -NoNewline -ForegroundColor Green
        Write-Host "RUNNING" -ForegroundColor Green
    } else {
        Write-Host "✗ $name (port $port) - " -NoNewline -ForegroundColor Red
        Write-Host "NOT RUNNING" -ForegroundColor Red
    }
}

Write-Host ""

# Check URLs
Write-Host "Testing HTTP endpoints..." -ForegroundColor Yellow
Write-Host ""

$endpoints = @{
    "Frontend" = "http://localhost:5173"
    "Backend Health" = "http://localhost:3001/health"
    "Model Server Health" = "http://localhost:8001/health"
}

foreach ($endpoint in $endpoints.GetEnumerator()) {
    $url = $endpoint.Value
    $name = $endpoint.Key

    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "✓ $name - " -NoNewline -ForegroundColor Green
        Write-Host "OK (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "✗ $name - " -NoNewline -ForegroundColor Red
        Write-Host "FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Troubleshooting ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If services are not running:" -ForegroundColor Yellow
Write-Host "  1. Run: .\start-simple.ps1" -ForegroundColor Gray
Write-Host "  2. Check for errors in the service windows" -ForegroundColor Gray
Write-Host "  3. Make sure ports are not in use by other apps" -ForegroundColor Gray
Write-Host ""
Write-Host "If 'AI failed to get predictions':" -ForegroundColor Yellow
Write-Host "  - Backend must be running on port 3001" -ForegroundColor Gray
Write-Host "  - Model Server must be running on port 8001" -ForegroundColor Gray
Write-Host "  - Check backend/.env has MODEL_SERVER_URL=http://localhost:8001" -ForegroundColor Gray
Write-Host ""
