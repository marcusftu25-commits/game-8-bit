# =============================================================================
# 8-BIT ARCADE DUO - TEST RUNNER LAUNCHER (PowerShell)
# =============================================================================

$pythonPath = "C:\Users\user\AppData\Local\Python\pythoncore-3.14-64\python.exe"

if (-not (Test-Path $pythonPath)) {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) {
        $pythonPath = $cmd.Source
    } else {
        Write-Error "Khong tim thay Python tren he thong."
        exit 1
    }
}

$scriptPath = Join-Path $PSScriptRoot "run_all_tests.py"
& $pythonPath $scriptPath
exit $LASTEXITCODE
