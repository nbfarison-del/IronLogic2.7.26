<#
.SYNOPSIS
    Code Review Agent — scans src/ for lint errors, dead code, anti-patterns
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

Write-Log "INFO" "=== Code Review Agent started ==="

$SrcDir = "$ProjectRoot\src"
$ReportLines = @()

# ── 1. Check ESLint ────────────────────────────────────────────
Write-Log "INFO" "Running ESLint scan..."
$eslintResult = & "npx" "eslint" "$SrcDir" "--format" "json" 2>&1
$eslintExit = $LASTEXITCODE

# Try to parse JSON output
$eslintJson = $null
try { $eslintJson = $eslintResult | ConvertFrom-Json } catch {}

if ($eslintJson) {
    $totalErrors = 0
    $totalWarnings = 0
    foreach ($file in $eslintJson) {
        $totalErrors += ($file.errorCount -as [int])
        $totalWarnings += ($file.warningCount -as [int])
        if ($file.messages.Count -gt 0) {
            foreach ($msg in $file.messages) {
                $ReportLines += "[$($msg.severity -eq 2 ? 'ERROR' : 'WARN')] $($file.filePath):$($msg.line) $($msg.message)"
            }
        }
    }
    Write-Log "INFO" "ESLint: $totalErrors errors, $totalWarnings warnings"
} else {
    Write-Log "WARN" "ESLint JSON output not parseable — capturing raw output"
    $ReportLines += $eslintResult | Out-String
}

# ── 2. Find console.log in production code ─────────────────────
Write-Log "INFO" "Checking for console.log statements..."
$consoleLogs = Get-ChildItem $SrcDir -Recurse -Filter "*.jsx","*.js" `
    | Where-Object { $_.Name -notlike "*.test.*" -and $_.Name -notlike "*.spec.*" } `
    | ForEach-Object { $path = $_.FullName; Select-String -Path $path -Pattern "console\.log\(" -SimpleMatch } `
    | Where-Object { $_.Line -notmatch "console\.error" -and $_.Line -notmatch "console\.warn" }

$consoleCount = ($consoleLogs | Measure-Object).Count
if ($consoleCount -gt 0) {
    Write-Log "WARN" "Found $consoleCount console.log() statements in production code"
    foreach ($cl in $consoleLogs) {
        $relPath = $cl.Path.Replace($ProjectRoot, "").TrimStart("\")
        $ReportLines += "[WARN] $relPath:$($cl.LineNumber) $($cl.Line.Trim())"
    }
} else {
    Write-Log "INFO" "No console.log() statements found in production code"
}

# ── 3. TODO/FIXME/HACK count ──────────────────────────────────
Write-Log "INFO" "Counting TODO/FIXME/HACK comments..."
$todos = Get-ChildItem $SrcDir -Recurse -Filter "*.jsx","*.js","*.css" `
    | ForEach-Object { Select-String -Path $_.FullName -Pattern "\b(TODO|FIXME|HACK|XXX)\b" }

$todoCount = ($todos | Measure-Object).Count
Write-Log "INFO" "Found $todoCount TODO/FIXME/HACK comments"
if ($todoCount -gt 0) {
    $todos | Group-Object { $_.Pattern } | ForEach-Object {
        $ReportLines += "[INFO] $($_.Name): $($_.Count) occurrences"
    }
}

# ── 4. Large files ─────────────────────────────────────────────
Write-Log "INFO" "Checking for large files (>500 lines)..."
$largeFiles = Get-ChildItem $SrcDir -Recurse -Filter "*.jsx","*.js" `
    | Where-Object { (Get-Content $_.FullName | Measure-Object).Count -gt 500 }

foreach ($lf in $largeFiles) {
    $lineCount = (Get-Content $lf.FullName | Measure-Object).Count
    $relPath = $lf.FullName.Replace($ProjectRoot, "").TrimStart("\")
    $ReportLines += "[INFO] Large file: $relPath ($lineCount lines)"
    Write-Log "INFO" "Large file: $relPath ($lineCount lines)"
}

# ── 5. Summary ─────────────────────────────────────────────────
Write-Log "INFO" "=== Code Review Agent finished ==="

# Output structured result for the master launcher
$summary = @{
    eslint_errors   = if ($eslintJson) { $totalErrors } else { $null }
    eslint_warnings = if ($eslintJson) { $totalWarnings } else { $null }
    console_logs    = $consoleCount
    todo_count      = $todoCount
    large_files     = ($largeFiles | Measure-Object).Count
}

$summary | ConvertTo-Json | Write-Host
$ReportLines | ForEach-Object { Write-Host $_ }
