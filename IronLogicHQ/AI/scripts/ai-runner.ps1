param(
    [Parameter(Mandatory = $true)]
    [string]$PromptName,

    [Parameter(Mandatory = $false)]
    [string]$Context = "",

    [Parameter(Mandatory = $false)]
    [string]$SessionId = "",

    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Get-Location).Path,

    [Parameter(Mandatory = $false)]
    [string]$OpenCodeCmd = "opencode",

    [Parameter(Mandatory = $false)]
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"

# Resolve project root to absolute path
$ProjectRoot = Resolve-Path $ProjectRoot

# Paths
$promptFile = Join-Path $ProjectRoot "IronLogicHQ\AI\prompts\$PromptName.md"
$reportsDir = Join-Path $ProjectRoot "IronLogicHQ\AI\reports"
$logsDir = Join-Path $ProjectRoot "IronLogicHQ\AI\logs"

# Generate session ID if not provided
if (-not $SessionId) {
    $SessionId = "$PromptName-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

# Timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$reportFile = Join-Path $reportsDir "$SessionId.md"
$logFile = Join-Path $logsDir "$SessionId.log"

# Validate prompt exists
if (-not (Test-Path $promptFile)) {
    $msg = "PROMPT_NOT_FOUND: $promptFile"
    "$msg" | Out-File -FilePath $logFile -Encoding utf8
    Write-Error $msg
    exit 1
}

# Read prompt
$promptContent = Get-Content $promptFile -Raw

# Build full prompt with optional context
$fullPrompt = $promptContent
if ($Context) {
    $fullPrompt = @"
$promptContent

## Context from previous pipeline step

$Context
"@
}

# Log start
$startLog = "[$timestamp] RUNNING: $PromptName (session: $SessionId)"
$startLog | Out-File -FilePath $logFile -Encoding utf8
$sessionLog = Join-Path $logsDir "session.log"
$startLog | Out-File -FilePath $sessionLog -Encoding utf8 -Append

if ($ShowVerbose) { Write-Host $startLog }

# Ensure reports dir exists
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

# Execute with opencode
$exitCode = 0
$output = ""

try {
    # Pipe the prompt to opencode via stdin
    $output = $fullPrompt | & $OpenCodeCmd 2>&1
    $exitCode = $LASTEXITCODE
}
catch {
    $exitCode = 1
    $output = "ERROR: $_`n$($_.ScriptStackTrace)"
}

# Determine status
if ($exitCode -eq 0) {
    $status = "SUCCESS"
}
elseif ($exitCode -eq 1 -and $output -match "PROMPT_NOT_FOUND") {
    $status = "SKIPPED"
}
else {
    $status = "FAILURE"
}

# Build report
$report = @"
# AI Runner Report

**Prompt**: $PromptName
**Session**: $SessionId
**Timestamp**: $timestamp
**Status**: ${status}
**Exit Code**: $exitCode

---

## Output

$output
"@

# Save report
$report | Out-File -FilePath $reportFile -Encoding utf8

# Save log
$endLog = "[$timestamp] ${status}: $PromptName (session: $SessionId, exit: $exitCode)"
$endLog | Out-File -FilePath $logFile -Encoding utf8 -Append
$endLog | Out-File -FilePath $sessionLog -Encoding utf8 -Append

if ($ShowVerbose) { Write-Host $endLog }

# Output result object
[PSCustomObject]@{
    PromptName = $PromptName
    SessionId  = $SessionId
    Status     = $status
    ExitCode   = $exitCode
    ReportFile = $reportFile
    LogFile    = $logFile
    Output     = $output
}

exit $exitCode
