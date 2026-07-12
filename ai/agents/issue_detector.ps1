<#
.SYNOPSIS
    Issue Detection Agent — analyzes logs and reports for recurring problems
.PARAMETER ProjectRoot
    Absolute path to project root
.PARAMETER Config
    Parsed automation_config.json object
.PARAMETER LogFile
    Path to the active log file
#>

param(
    [Parameter(Mandatory = $true)] [string]$ProjectRoot,
    [Parameter(Mandatory = $true)] $Config,
    [Parameter(Mandatory = $true)] [string]$LogFile
)

function Write-Log {
    param([string]$Level, [string]$Message)
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

Write-Log "INFO" "=== Issue Detection Agent started ==="

$LogDir = "$ProjectRoot\$($Config.logging.log_dir)"
$ReportDir = "$ProjectRoot\$($Config.reports.report_dir)"
$ConfigPath = "$ProjectRoot\config\automation_config.json"
$ReportLines = @()
$issues = @()

# ── 1. Check for ERROR entries in recent logs ──────────────────
Write-Log "INFO" "Scanning recent logs for errors..."
$cutoff = (Get-Date).AddDays(-30)
$recentLogs = Get-ChildItem $LogDir -Filter "*.log" | Where-Object { $_.LastWriteTime -ge $cutoff }

$errorCount = 0
foreach ($log in $recentLogs) {
    $errors = Select-String -Path $log.FullName -Pattern "\[ERROR\]" -SimpleMatch
    if ($errors) {
        $errorCount += ($errors | Measure-Object).Count
        $issues += @{
            severity = "ERROR"
            source   = $log.Name
            count    = ($errors | Measure-Object).Count
            samples  = $errors | Select-Object -First 3 -ExpandProperty Line
        }
    }
}

Write-Log "INFO" "Found $errorCount error lines across $($recentLogs.Count) log files"

# ── 2. Check for failed agent runs ─────────────────────────────
Write-Log "INFO" "Checking for failed agent runs..."
$failedRuns = Select-String -Path $LogDir\*.log -Pattern "exited with code" -SimpleMatch

$failedCount = ($failedRuns | Measure-Object).Count
if ($failedCount -gt 0) {
    Write-Log "WARN" "Found $failedCount failed agent runs"
    $issues += @{
        severity = "WARN"
        source   = "agent logs"
        count    = $failedCount
        samples  = $failedRuns | Select-Object -First 5 -ExpandProperty Line
    }
}

# ── 3. Config validation — do referenced agents/prompts exist? ─
Write-Log "INFO" "Validating config references..."
$schedule = $Config.schedule
$configIssues = 0

foreach ($entry in $schedule.PSObject.Properties) {
    $name = $entry.Name
    $cfg  = $entry.Value

    $agentPath = "$ProjectRoot\ai\agents\$($cfg.agent)"
    if (-not (Test-Path $agentPath)) {
        $configIssues++
        $ReportLines += "[ERROR] Missing agent script: $agentPath"
    }

    if ($cfg.prompt) {
        $promptPath = "$ProjectRoot\ai\prompts\$($cfg.prompt)"
        if (-not (Test-Path $promptPath)) {
            $configIssues++
            $ReportLines += "[ERROR] Missing prompt template: $promptPath"
        }
    }
}

if ($configIssues -gt 0) {
    Write-Log "WARN" "Found $configIssues config validation issue(s)"
} else {
    Write-Log "INFO" "Config validation passed"
}

# ── 4. Disk usage ──────────────────────────────────────────────
Write-Log "INFO" "Checking disk usage..."
$aiDir = "$ProjectRoot\$($Config.ai_root)"
$aiSize = (Get-ChildItem $aiDir -Recurse | Measure-Object -Property Length -Sum).Sum
$aiSizeMB = [Math]::Round($aiSize / 1MB, 2)
Write-Log "INFO" "AI directory size: $aiSizeMB MB"

$logDirSize = (Get-ChildItem $LogDir -Recurse | Measure-Object -Property Length -Sum).Sum
$logDirSizeMB = [Math]::Round($logDirSize / 1MB, 2)
$ReportLines += "[INFO] Log directory: $logDirSizeMB MB"

# ── Summary ────────────────────────────────────────────────────
$summary = @{
    error_lines       = $errorCount
    failed_runs       = $failedCount
    config_issues     = $configIssues
    ai_dir_size_mb    = $aiSizeMB
    logs_size_mb      = $logDirSizeMB
    issues_found      = $issues.Count
}

Write-Log "INFO" "=== Issue Detection Agent finished ==="

$summary | ConvertTo-Json | Write-Host
$ReportLines | ForEach-Object { Write-Host $_ }
