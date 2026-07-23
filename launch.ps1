# Clean up any previous server running on port 5173
$existing = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($existing) {
  foreach ($conn in $existing) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
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

# Start the Vite server in the background (hidden window)
$viteProcess = Start-Process "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "d:\projects\GATERevisionTrackerWebsite\tracker-app" -WindowStyle Hidden -PassThru

# Wait for Vite to boot and listen on port 5173 (check up to 15 times)
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 1
  $conn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
  if ($conn) {
    $ready = $true
    break
  }
}

# Open browser window
if ($browserPath -ne "") {
  # Open in App Mode (looks like a clean desktop application!)
  $appProcess = Start-Process $browserPath -ArgumentList "--app=http://localhost:5173" -PassThru -Wait
} else {
  # Fallback: Open in default browser
  Start-Process "http://localhost:5173"
}

# Clean up: find and kill the process currently listening on port 5173
$conn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($conn) {
  foreach ($c in $conn) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

# Also kill the parent cmd process we spawned
Stop-Process -Id $viteProcess.Id -Force -ErrorAction SilentlyContinue
