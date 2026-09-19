# Check if Backend API server (port 5000) is running
$backendReady = $false
try {
  $bReq = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
  if ($bReq.StatusCode -eq 200) { $backendReady = $true }
} catch { $backendReady = $false }

if (-not $backendReady) {
  $bExisting = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
  if ($bExisting) {
    foreach ($conn in $bExisting) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 300
  }
  $wsServer = New-Object -ComObject WScript.Shell
  $wsServer.CurrentDirectory = "d:\projects\GATERevisionTrackerWebsite\server"
  $wsServer.Run("cmd.exe /c npm start", 0, $false)
}

# Check if Vite server is already running and responsive
$serverReady = $false
try {
  $testReq = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
  if ($testReq.StatusCode -eq 200) {
    $serverReady = $true
  }
} catch {
  $serverReady = $false
}

# If not running or not responsive, clean up any stale port 5173 listeners and start fresh
if (-not $serverReady) {
  $existing = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
  if ($existing) {
    foreach ($conn in $existing) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
  }

  # Start the Vite server in the background as a detached process (hidden window)
  $ws = New-Object -ComObject WScript.Shell
  $ws.CurrentDirectory = "d:\projects\GATERevisionTrackerWebsite\tracker-app"
  $ws.Run("cmd.exe /c npm run dev", 0, $false)

  # Wait for Vite to boot and respond to HTTP requests (up to 15 seconds)
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $check = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
      if ($check.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {}
  }
}

# Find Brave or Chrome executable path
$browserPath = ""
$paths = @(
  "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
  "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
  "$env:LocalAppData\BraveSoftware\Brave-Browser\Application\brave.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    $browserPath = $path
    break
  }
}

# Open application window
if ($browserPath -ne "") {
  # Open in clean desktop App Mode
  Start-Process $browserPath -ArgumentList "--app=http://localhost:5173"
} else {
  # Fallback: Open in default browser
  Start-Process "http://localhost:5173"
}

exit 0
