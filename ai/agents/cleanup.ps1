<#
.SYNOPSIS
    Cleanup Agent — archives old logs, trims memory, prunes stale reports
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

Write-Log "INFO" "=== Cleanup Agent started ==="

$LogDir = "$ProjectRoot\$($Config.logging.log_dir)"
$ReportDir = "$ProjectRoot\$($Config.reports.report_dir)"
$MemoryDir = "$ProjectRoot\$($Config.memory.memory_dir)"

$filesDeleted = 0
$bytesRecovered = 0

# ── 1. Archive old logs ────────────────────────────────────────
$maxDays = [int]$Config.logging.max_log_days
$cutoff = (Get-Date).AddDays(-$maxDays)

Write-Log "INFO" "Pruning logs older than $maxDays days (before $($cutoff.ToString('yyyy-MM-dd')))..."

$oldLogs = Get-ChildItem $LogDir -Filter "*.log" | Where-Object { $_.LastWriteTime -lt $cutoff -and $_.LastWriteTime -lt (Get-Date).AddDays(-1) } # keep files <24h

foreach ($log in $oldLogs) {
    $size = $log.Length
    Write-Log "INFO" "Deleting old log: $($log.Name) ($([Math]::Round($size/1KB, 1)) KB)"
    Remove-Item $log.FullName -Force
    $filesDeleted++
    $bytesRecovered += $size
}

# ── 2. Prune memory files ──────────────────────────────────────
$maxMemFiles = [int]$Config.memory.max_context_files
Write-Log "INFO" "Trimming memory files (keeping $maxMemFiles most recent)..."
$memFiles = Get-ChildItem $MemoryDir -File | Sort-Object LastWriteTime -Descending

if ($memFiles.Count -gt $maxMemFiles) {
    $toRemove = $memFiles[$maxMemFiles..($memFiles.Count - 1)]
    foreach ($f in $toRemove) {
        $size = $f.Length
        Write-Log "INFO" "Removing old memory file: $($f.Name)"
        Remove-Item $f.FullName -Force
        $filesDeleted++
        $bytesRecovered += $size
    }
}

# ── 3. Prune old reports ───────────────────────────────────────
$maxReports = [int]$Config.reports.max_reports
Write-Log "INFO" "Pruning reports (keeping $maxReports most recent)..."
$reports = Get-ChildItem $ReportDir -Filter "*.md" | Sort-Object LastWriteTime -Descending

if ($reports.Count -gt $maxReports) {
    $toRemove = $reports[$maxReports..($reports.Count - 1)]
    foreach ($r in $toRemove) {
        $size = $r.Length
        Write-Log "INFO" "Removing old report: $($r.Name)"
        Remove-Item $r.FullName -Force
        $filesDeleted++
        $bytesRecovered += $size
    }
}

# ── 4. Report space recovered ──────────────────────────────────
$recoveredKB = [Math]::Round($bytesRecovered / 1KB, 1)
$recoveredMB = [Math]::Round($bytesRecovered / 1MB, 2)

Write-Log "INFO" "Cleanup complete: $filesDeleted file(s) removed, $recoveredKB KB ($recoveredMB MB) recovered"

# ── Summary ────────────────────────────────────────────────────
$summary = @{
    files_deleted     = $filesDeleted
    bytes_recovered   = $bytesRecovered
    recovered_kb      = $recoveredKB
    recovered_mb      = $recoveredMB
    logs_pruned       = ($oldLogs | Measure-Object).Count
    reports_pruned    = ($reports | Measure-Object).Count - ($reports | Measure-Object).Count
}

Write-Log "INFO" "=== Cleanup Agent finished ==="

$summary | ConvertTo-Json | Write-Host
