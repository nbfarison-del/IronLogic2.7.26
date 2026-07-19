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
    [string]$OpenCodeCmd = "$env:APPDATA\npm\opencode.cmd",
    [Parameter(Mandatory = $false)]
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path $ProjectRoot

$promptFile  = Join-Path $ProjectRoot "IronLogicHQ\AI\prompts\$PromptName.md"
$reportsDir  = Join-Path $ProjectRoot "IronLogicHQ\AI\reports"
$logsDir     = Join-Path $ProjectRoot "IronLogicHQ\AI\logs"
$sessionLog  = Join-Path $logsDir "session.log"

if (-not $SessionId) {
    $SessionId = "$PromptName-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$reportFile = Join-Path $reportsDir "$SessionId.md"
$logFile    = Join-Path $logsDir "$SessionId.log"

if (-not (Test-Path $promptFile)) {
    $msg = "[$timestamp] PROMPT_NOT_FOUND: $promptFile"
    $msg | Out-File -FilePath $logFile -Encoding utf8
    Write-Error $msg
    exit 1
}

$promptContent = Get-Content $promptFile -Raw
$fullPrompt = $promptContent
if ($Context) {
    $fullPrompt = "$promptContent`n`n## Context from previous pipeline step`n`n$Context"
}

$startLine = "[$timestamp] RUNNING: $PromptName (session: $SessionId)"
$startLine | Out-File -FilePath $logFile -Encoding utf8
$startLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append
if ($ShowVerbose) { Write-Host $startLine }

if (-not (Test-Path $reportsDir)) { New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null }

$exitCode = 0
$output = ""
try {
    $output = $fullPrompt | & $OpenCodeCmd run --auto
    $exitCode = $LASTEXITCODE
}
catch {
    $exitCode = 1
    $output = "ERROR: $_"
}

$status = if ($exitCode -eq 0) { "SUCCESS" } else { "FAILURE" }

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

$report | Out-File -FilePath $reportFile -Encoding utf8

$endLine = "[$timestamp] ${status}: $PromptName (session: $SessionId, exit: $exitCode)"
$endLine | Out-File -FilePath $logFile -Encoding utf8 -Append
$endLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append
if ($ShowVerbose) { Write-Host $endLine }

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
