# =============================================================================
# 8-BIT ARCADE DUO - E2E & PHONE RESPONSIVE AUTOMATED TEST RUNNER
# Su dung Chrome / Edge Headless voi DevTools Protocol (CDP)
# =============================================================================

param (
    [int]$Port = 9445,
    [string]$BrowserPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BrowserPath)) {
    if (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") {
        $BrowserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    } else {
        Write-Error "Khong tim thay Google Chrome hoac Microsoft Edge tai duong dan mac dinh."
    }
}

$workspaceDir = (Get-Item $PSScriptRoot).Parent.FullName
$htmlPath = Join-Path $workspaceDir "8bit_arcade_duo.html"
$fileUrl = "file:///" + ($htmlPath -replace '\\', '/')

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " 8-BIT ARCADE DUO - KIEM TRA PHONE RESPONSIVE VA INTEGRATION E2E" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Trinh duyet: $BrowserPath" -ForegroundColor Gray
Write-Host "File muc tieu: $htmlPath" -ForegroundColor Gray

# Khoi dong Chrome Headless voi remote debugging port va temp user-data-dir
$tempUserDataDir = Join-Path $env:TEMP ("arcade_chrome_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempUserDataDir -Force | Out-Null

$chromeArgs = @(
    "--headless=new",
    "--remote-debugging-port=$Port",
    "--remote-allow-origins=*",
    "--user-data-dir=$tempUserDataDir",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    $fileUrl
)

$process = Start-Process -FilePath $BrowserPath -ArgumentList $chromeArgs -PassThru
$ws = $null

try {
    # Cho CDP san sang va lay page target
    $maxRetries = 30
    $retry = 0
    $wsUrl = $null

    while ($retry -lt $maxRetries) {
        Start-Sleep -Milliseconds 300
        try {
            $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -Method Get
            if ($targets) {
                # Uu tien target kieu page
                $pageTarget = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
                if ($pageTarget -and $pageTarget.webSocketDebuggerUrl) {
                    $wsUrl = $pageTarget.webSocketDebuggerUrl
                    break
                } elseif ($targets.Count -gt 0 -and $targets[0].webSocketDebuggerUrl) {
                    $wsUrl = $targets[0].webSocketDebuggerUrl
                    break
                }
            }
        } catch {
            $retry++
        }
    }

    if (-not $wsUrl) {
        throw "Khong the ket noi CDP qua cong $Port sau $maxRetries lan thu."
    }

    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $ws.ConnectAsync([Uri]$wsUrl, $cts.Token).Wait()

    $msgId = 0

    function Send-CdpCommand([string]$method, [hashtable]$params = @{}) {
        $script:msgId++
        $targetId = $script:msgId
        $cmd = @{
            id = $targetId
            method = $method
            params = $params
        } | ConvertTo-Json -Compress -Depth 10

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($cmd)
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
        $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()

        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        while ($sw.ElapsedMilliseconds -lt 10000) {
            $buffer = New-Object byte[] 65536
            $recvSeg = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
            $readTask = $ws.ReceiveAsync($recvSeg, $cts.Token)
            if (-not $readTask.Wait(4000)) { break }
            $count = $readTask.Result.Count
            $respJson = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $count)
            try {
                $obj = $respJson | ConvertFrom-Json
                if ($obj.id -eq $targetId) {
                    return $obj
                }
            } catch {}
        }
        throw "CDP command '$method' (id $targetId) bi timeout sau 10 giay"
    }

    function Eval-Js([string]$expression) {
        $res = Send-CdpCommand "Runtime.evaluate" @{
            expression = $expression
            returnByValue = $true
            awaitPromise = $true
        }
        if ($res.exceptionDetails) {
            throw "JS Exception in '$expression': " + ($res.exceptionDetails | ConvertTo-Json -Compress)
        }
        return $res.result.value
    }

    # 1. Kiem tra trang da load
    Write-Host "`n[1/5] Kiem tra trang 8bit_arcade_duo.html..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    # Cho DOM va tailwind CDN nạp xong
    $docTitle = Eval-Js "document.title"
    Write-Host "✓ Trang da tai thanh cong. Title: '$docTitle'" -ForegroundColor Green

    $passed = 0
    $failed = 0

    function Assert-Test([string]$name, [bool]$condition, [string]$detail = "") {
        if ($condition) {
            Write-Host "  [PASS] $name" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "  [FAIL] $name - $detail" -ForegroundColor Red
            $script:failed++
        }
    }

    # 2. KIEM TRA PHONE RESPONSIVE: MAN HINH DI DONG (iPhone 14 - 390x844)
    Write-Host "`n[2/5] Kiem tra Phone Responsive tai Viewport Mobile (390 x 844)..." -ForegroundColor Yellow
    Send-CdpCommand "Emulation.setDeviceMetricsOverride" @{
        width = 390
        height = 844
        deviceScaleFactor = 3
        mobile = $true
    }
    Start-Sleep -Milliseconds 400

    # Chuyen den view-game de kiem tra mobile controls
    Eval-Js "navigateTo('game')"

    $mobileControlsDisplay = Eval-Js "window.getComputedStyle(document.getElementById('mobile-controls')).display"
    Assert-Test "Tay cam cam ung (#mobile-controls) phai hien thi tren mobile" ($mobileControlsDisplay -ne 'none') "Computed display: $mobileControlsDisplay"

    $headerBadgeDisplay = Eval-Js "window.getComputedStyle(document.getElementById('header-room-badge')).display"
    Assert-Test "Huy hieu phong (#header-room-badge) phai an tren mobile (hidden md:flex)" ($headerBadgeDisplay -eq 'none') "Computed display: $headerBadgeDisplay"

    $btnCrtDisplay = Eval-Js "window.getComputedStyle(document.getElementById('btn-crt')).display"
    Assert-Test "Nut CRT (#btn-crt) an tren mobile nho (< 640px)" ($btnCrtDisplay -eq 'none') "Computed display: $btnCrtDisplay"

    $dpadBtnsCount = Eval-Js "document.querySelectorAll('#mobile-controls button.touch-btn').length"
    Assert-Test "Cum D-Pad va Action buttons tren mobile chua du 6 nut cam ung" ($dpadBtnsCount -eq 6) "So nut tim thay: $dpadBtnsCount"

    # 3. KIEM TRA DESKTOP VIEWPORT: MAN HINH MAY TINH (1280 x 800)
    Write-Host "`n[3/5] Kiem tra Viewport Desktop (1280 x 800)..." -ForegroundColor Yellow
    Send-CdpCommand "Emulation.setDeviceMetricsOverride" @{
        width = 1280
        height = 800
        deviceScaleFactor = 1
        mobile = $false
    }
    Start-Sleep -Milliseconds 400

    $mobileControlsDesktop = Eval-Js "window.getComputedStyle(document.getElementById('mobile-controls')).display"
    Assert-Test "Tay cam cam ung (#mobile-controls) phai tu dong an tren Desktop" ($mobileControlsDesktop -eq 'none') "Computed display: $mobileControlsDesktop"

    $headerBadgeDesktop = Eval-Js "window.getComputedStyle(document.getElementById('header-room-badge')).display"
    Assert-Test "Huy hieu phong (#header-room-badge) hien thi tren Desktop (flex)" ($headerBadgeDesktop -ne 'none') "Computed display: $headerBadgeDesktop"

    $btnCrtDesktop = Eval-Js "window.getComputedStyle(document.getElementById('btn-crt')).display"
    Assert-Test "Nut CRT (#btn-crt) hien thi tren Desktop" ($btnCrtDesktop -ne 'none') "Computed display: $btnCrtDesktop"

    # 4. KIEM TRA INTEGRATION: VONG DOI GIAO DIEN & SU KIEN NGUOI CHOI
    Write-Host "`n[4/5] Kiem tra Integration: Vong doi chuyen View va Modals..." -ForegroundColor Yellow
    
    Eval-Js "navigateTo('lobby')"
    $lobbyVisible = Eval-Js "!document.getElementById('view-lobby').classList.contains('hidden')"
    Assert-Test "Chuyen ve view-lobby thanh cong" ($lobbyVisible -eq $true)

    # Tao phong moi
    Eval-Js "createNewRoom('tank')"
    $roomCode = Eval-Js "AppState.room.code"
    $isRoomVisible = Eval-Js "!document.getElementById('view-room').classList.contains('hidden')"
    Assert-Test "Tao phong moi chuyen sang view-room voi ma 4 ky tu" ($isRoomVisible -and $roomCode.Length -eq 4) "Ma phong: $roomCode"

    # Bat dau tran dau
    Eval-Js "startMatch(true)"
    $isGameRunning = Eval-Js "AppState.match.running"
    $hudTitle = Eval-Js "document.getElementById('hud-game-title').textContent"
    Assert-Test "Bat dau tran dau khoi dong game engine va HUD" ($isGameRunning -and $hudTitle.Length -gt 0) "Title: $hudTitle"

    # Pause game
    Eval-Js "togglePauseGame()"
    $isPaused = Eval-Js "AppState.match.paused"
    Assert-Test "Tam dung tran dau (Pause Overlay)" ($isPaused -eq $true)

    # Resume game
    Eval-Js "togglePauseGame()"
    $isResumed = Eval-Js "!AppState.match.paused"
    Assert-Test "Tiep tuc tran dau bo pause" ($isResumed -eq $true)

    # Ket thuc tran dau
    Eval-Js "AppState.match.p1Score = 800; AppState.match.p2Score = 300; endMatch()"
    $winnerTitle = Eval-Js "document.getElementById('winner-title').textContent"
    Assert-Test "Ket thuc tran dau hien thi nguoi chien thang P1" ($winnerTitle -like "*NGƯỜI CHƠI 1 CHIẾN THẮNG*") "Winner: $winnerTitle"

    # Profile Modal update
    Eval-Js "openProfileModal(); selectAvatar('🥷'); document.getElementById('input-player-name').value = 'Test_Champion'; saveProfile()"
    $updatedName = Eval-Js "AppState.player.name"
    $updatedAvatar = Eval-Js "AppState.player.avatar"
    Assert-Test "Cap nhat ho so nguoi choi (Avatar 🥷, Ten Test_Champion)" ($updatedName -eq 'Test_Champion' -and $updatedAvatar -eq '🥷')

    # 5. TONG KET KET QUA
    Write-Host "`n[5/5] Tong ket ket qua kiem thu:" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  Tong so tests:   $($passed + $failed)" -ForegroundColor White
    Write-Host "  Thanh cong:      $passed" -ForegroundColor Green
    Write-Host "  That bai:        $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
    Write-Host "======================================================================" -ForegroundColor Cyan

    if ($failed -gt 0) {
        exit 1
    }

} finally {
    if ($ws -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        try {
            $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", [System.Threading.CancellationToken]::None).Wait(1000)
        } catch {}
    }
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    if ($tempUserDataDir -and (Test-Path $tempUserDataDir)) {
        Start-Sleep -Milliseconds 500
        Remove-Item -Path $tempUserDataDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
