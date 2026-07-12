param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("weekly", "monthly", "research", "custom")]
    [string]$Pipeline,

    [Parameter(Mandatory = $false)]
    [string]$CustomPrompts = "",

    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Get-Location).Path,

    [Parameter(Mandatory = $false)]
    [string]$OpenCodeCmd = "opencode",

    [Parameter(Mandatory = $false)]
    [switch]$SkipReport,

    [Parameter(Mandatory = $false)]
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path $ProjectRoot

# Scripts directory
$runnerScript = Join-Path $ProjectRoot "IronLogicHQ\AI\scripts\ai-runner.ps1"

# Validate runner exists
if (-not (Test-Path $runnerScript)) {
    Write-Error "ai-runner.ps1 not found at $runnerScript"
    exit 1
}

# Define pipeline sequences -------------------------------------------------
$pipelineSteps = @()

switch ($Pipeline) {
    "weekly" {
        $pipelineSteps = @(
            @{ Prompt = "project_manager";  Label = "Project Manager" },
            @{ Prompt = "ironlogic_engineer"; Label = "IronLogic Engineer" }
        )
    }
    "monthly" {
        $pipelineSteps = @(
            @{ Prompt = "project_manager";     Label = "Project Manager" },
            @{ Prompt = "research_engineer";    Label = "Research Engineer" },
            @{ Prompt = "ironlogic_engineer";   Label = "IronLogic Engineer (Review)" }
        )
    }
    "research" {
        $pipelineSteps = @(
            @{ Prompt = "research_engineer";    Label = "Research Engineer" }
        )
    }
    "custom" {
        if (-not $CustomPrompts) {
            Write-Error "Custom pipeline requires -CustomPrompts (comma-separated prompt names)"
            exit 1
        }
        $pipelineSteps = $CustomPrompts -split "," | ForEach-Object {
            @{ Prompt = $_.Trim(); Label = $_.Trim() }
        }
    }
}

# Generate a session ID for the entire pipeline run
$pipelineSession = "pipeline-$Pipeline-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================"
Write-Host "  Master Runner â€” Pipeline: $Pipeline"
Write-Host "  Session: $pipelineSession"
Write-Host "  Steps: $($pipelineSteps.Count)"
Write-Host "========================================"
Write-Host ""

# Track results
$results = @()
$context = ""    # Passed between steps

foreach ($step in $pipelineSteps) {
    $promptName = $step.Prompt
    $label = $step.Label

    Write-Host "--- Step: $label ($promptName) ---"

    # Per-step session ID
    $stepSession = "$pipelineSession-$promptName"

    # Build arguments (hashtable splatting for named parameters)
    $splat = @{
        PromptName  = $promptName
        SessionId   = $stepSession
        ProjectRoot = $ProjectRoot
        OpenCodeCmd = $OpenCodeCmd
    }

    if ($context) {
        $splat.Context = $context
    }

    if ($ShowVerbose) {
        $splat.ShowVerbose = $true
    }

    # Execute the runner
    $result = & $runnerScript @splat 2>&1
    $exitCode = $LASTEXITCODE

    # Capture result
    $resultObj = $null
    if ($result -is [System.Management.Automation.PSCustomObject]) {
        $resultObj = $result
    }
    else {
        $resultObj = [PSCustomObject]@{
            PromptName = $promptName
            SessionId  = $stepSession
            Status     = if ($exitCode -eq 0) { "SUCCESS" } else { "FAILURE" }
            ExitCode   = $exitCode
            Output     = ($result | Out-String)
        }
    }

    $results += $resultObj

    # Pass report output as context to next step
    if ($resultObj.Status -eq "SUCCESS") {
        $reportFile = Join-Path $ProjectRoot "IronLogicHQ\AI\reports\$stepSession.md"
        if (Test-Path $reportFile) {
            $context = Get-Content $reportFile -Raw
        }
        else {
            $context = $resultObj.Output
        }
    }
    else {
        Write-Warning "Step failed â€” passing error context to next step"
        $context = "Previous step ($label) failed with exit code ${exitCode}. Output: $($resultObj.Output)"
    }

    # Stop pipeline on failure unless it's the last step
    if ($exitCode -ne 0 -and $step -ne $pipelineSteps[-1]) {
        Write-Warning "Pipeline stopping early due to step failure"
        break
    }

    Write-Host ""
}

# Build pipeline summary report --------------------------------------------
$successCount = @($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failCount = @($results | Where-Object { $_.Status -eq "FAILURE" }).Count
$pipelineStatus = if ($failCount -eq 0) { "SUCCESS" } else { "FAILURE" }

$summary = @"
# Pipeline Report: $Pipeline

**Session**: $pipelineSession
**Timestamp**: $timestamp
**Status**: ${pipelineStatus}
**Steps**: $($results.Count) total, $successCount succeeded, $failCount failed

## Steps

"@

foreach ($r in $results) {
    $summary += "- **$($r.PromptName)**: $($r.Status) (exit code: $($r.ExitCode))`n"
}

if ($failCount -gt 0) {
    $summary += "`n## Failures`n"
    foreach ($r in $results | Where-Object { $_.Status -eq "FAILURE" }) {
        $summary += "`n### $($r.PromptName)`n`n"
        $summary += '```' + "`n"
        $summary += "$($r.Output)`n"
        $summary += '```' + "`n"
    }
}

# Save pipeline summary report
$reportsDir = Join-Path $ProjectRoot "IronLogicHQ\AI\reports"
$summaryFile = Join-Path $reportsDir "$pipelineSession-summary.md"
$summary | Out-File -FilePath $summaryFile -Encoding utf8

# Log results
$logsDir = Join-Path $ProjectRoot "IronLogicHQ\AI\logs"
$sessionLog = Join-Path $logsDir "session.log"
$logLine = "[$timestamp] PIPELINE $Pipeline ($pipelineSession): $successCount success, $failCount failure"
$logLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append

Write-Host "========================================"
Write-Host "  Pipeline Complete: $pipelineStatus"
Write-Host "  $successCount succeeded, $failCount failed"
Write-Host "  Summary: $summaryFile"
Write-Host "========================================"

# Return summary object
[PSCustomObject]@{
    Pipeline       = $Pipeline
    SessionId      = $pipelineSession
    Status         = $pipelineStatus
    Steps          = $results.Count
    SuccessCount   = $successCount
    FailCount      = $failCount
    SummaryFile    = $summaryFile
    StepResults    = $results
}

if ($failCount -gt 0) { exit 1 } else { exit 0 }
