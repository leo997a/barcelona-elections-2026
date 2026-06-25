param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('status', 'match', 'world-cup', 'set-match', 'start', 'stop')]
  [string] $Action,

  [string] $Url,
  [int] $IntervalSec = 60,
  [string] $BridgeUrl = $env:REO_BRIDGE_URL,
  [string] $Token = $env:REO_BRIDGE_TOKEN
)

if (-not $BridgeUrl) {
  $BridgeUrl = 'http://34.169.68.109:3005'
}

$BridgeUrl = $BridgeUrl.TrimEnd('/')

if (-not $Token) {
  throw 'Set REO_BRIDGE_TOKEN in your PowerShell session before using control actions.'
}

$headers = @{
  Authorization = "Bearer $Token"
}

function Invoke-ReoGet([string] $Path) {
  Invoke-RestMethod -Method Get -Uri "$BridgeUrl$Path" -Headers $headers
}

function Invoke-ReoPost([string] $Path, [hashtable] $Body) {
  Invoke-RestMethod -Method Post -Uri "$BridgeUrl$Path" -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
}

switch ($Action) {
  'status' { Invoke-ReoGet '/api/status' }
  'match' { Invoke-ReoGet '/api/match' }
  'world-cup' { Invoke-ReoGet '/api/world-cup' }
  'set-match' {
    if (-not $Url) { throw 'Use -Url with set-match.' }
    Invoke-ReoPost '/api/control/set-match' @{ url = $Url }
  }
  'start' {
    if (-not $Url) { throw 'Use -Url with start.' }
    Invoke-ReoPost '/api/control/start' @{ url = $Url; intervalSec = $IntervalSec }
  }
  'stop' { Invoke-ReoPost '/api/control/stop' @{} }
}
