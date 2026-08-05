# HOMS portable static file server (no internet required)
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://localhost:$Port/"

function Get-MimeType([string]$path) {
  switch ([IO.Path]::GetExtension($path).ToLower()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.js'   { return 'application/javascript; charset=utf-8' }
    '.mjs'  { return 'application/javascript; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.png'  { return 'image/png' }
    '.jpg'  { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.svg'  { return 'image/svg+xml' }
    '.ico'  { return 'image/x-icon' }
    '.woff' { return 'font/woff' }
    '.woff2'{ return 'font/woff2' }
    '.webp' { return 'image/webp' }
    default { return 'application/octet-stream' }
  }
}

Write-Host ''
Write-Host ' HOMS - Hostel Outpass Management'
Write-Host " Running at $url"
Write-Host ' Press Ctrl+C to stop.'
Write-Host ''

Start-Process $url

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $localPath = [Uri]::UnescapeDataString($request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrEmpty($localPath)) { $localPath = 'index.html' }

    $filePath = Join-Path $root ($localPath -replace '/', [IO.Path]::DirectorySeparatorChar)

    if (-not (Test-Path $filePath -PathType Leaf)) {
      $filePath = Join-Path $root 'index.html'
    }

    try {
      $bytes = [IO.File]::ReadAllBytes($filePath)
      $response.StatusCode = 200
      $response.ContentType = Get-MimeType $filePath
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      $response.StatusCode = 500
      $msg = [Text.Encoding]::UTF8.GetBytes('Server error')
      $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    $response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
