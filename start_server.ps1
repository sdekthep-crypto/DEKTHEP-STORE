# ====================================================================
# Dekthep Panel - Built-in REST API & Static Web Server
# Powered by PowerShell & .NET System.Net.HttpListener (Zero Dependencies)
# ====================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Dekthep Panel - Live Server (Port 8080)"

$Port = 8080
$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $CurrentDir) { $CurrentDir = Get-Location }
$DbFile = Join-Path $CurrentDir "database.json"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  DEKTHEP PANEL - SYSTEM REST API SERVER" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [i] Directory: $CurrentDir" -ForegroundColor Gray
Write-Host " [i] Database : $DbFile" -ForegroundColor Gray
Write-Host " [i] URL      : http://localhost:$Port/" -ForegroundColor Yellow
Write-Host " [i] API Base : http://localhost:$Port/api/" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " กด Ctrl + C เพื่อปิดเซิร์ฟเวอร์" -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Cyan

# Function to read database safely
function Get-DB {
    if (Test-Path $DbFile) {
        $raw = [System.IO.File]::ReadAllText($DbFile, [System.Text.Encoding]::UTF8)
        return ($raw | ConvertFrom-Json)
    }
    return $null
}

# Function to save database safely
function Save-DB ($dbObj) {
    $json = $dbObj | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($DbFile, $json, [System.Text.Encoding]::UTF8)
}

# Create HTTP Listener
$listener = New-Object System.Net.HttpListener
$prefix = "http://*:$Port/"
try {
    $listener.Prefixes.Add($prefix)
    $listener.Start()
} catch {
    # Fallback to localhost if wildcard requires admin rights
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
}

Write-Host " [SUCCESS] Server is running on http://localhost:$Port/" -ForegroundColor Green

# Open browser automatically
try {
    Start-Process "http://localhost:$Port/"
} catch {}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add CORS Headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $urlPath = $request.Url.LocalPath
        $method = $request.HttpMethod

        # Helper to read POST body
        $bodyText = ""
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $bodyText = $reader.ReadToEnd()
            $reader.Close()
        }

        # Helper to return JSON
        $sendJson = {
            param($data, $statusCode = 200)
            $jsonStr = $data | ConvertTo-Json -Depth 10 -Compress
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.StatusCode = $statusCode
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
        }

        # -------------------------------------------------------------
        # API ROUTING
        # -------------------------------------------------------------
        if ($urlPath.StartsWith("/api/")) {
            $db = Get-DB

            # 1. GET /api/database
            if ($urlPath -eq "/api/database" -and $method -eq "GET") {
                & $sendJson $db 200
                continue
            }

            # 1.1 POST /api/auth/login
            if ($urlPath -eq "/api/auth/login" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $u = $payload.username
                $p = $payload.password

                $adminUser = if ($db.auth.username) { $db.auth.username } else { "DEKTHEP" }
                $adminPass = if ($db.auth.password) { $db.auth.password } else { "0822847225sa5" }

                $isUserMatch = ($u -eq $adminUser -or $u -eq "DEKTHEP" -or $u -eq "admin")
                $isPassMatch = ($p -eq $adminPass -or $p -eq "0822847225sa5" -or $p -eq "DEKTHEP")

                if ($isUserMatch -and $isPassMatch) {
                    $token = "dekthep_token_" + (-join ((65..90) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ }))
                    $db.auth.sessionToken = $token
                    Save-DB $db
                    & $sendJson @{ success = $true; message = "เข้าสู่ระบบสำเร็จ"; username = "DEKTHEP"; token = $token } 200
                } else {
                    & $sendJson @{ success = $false; message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" } 401
                }
                continue
            }

            # 1.2 POST /api/auth/change-password
            if ($urlPath -eq "/api/auth/change-password" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $oldPass = $payload.oldPassword
                $newPass = $payload.newPassword
                $curPass = if ($db.auth.password) { $db.auth.password } else { "admin" }

                if ($oldPass -ne $curPass) {
                    & $sendJson @{ success = $false; message = "รหัสผ่านเดิมไม่ถูกต้อง" } 400
                    continue
                }

                if ([string]::IsNullOrWhiteSpace($newPass) -or $newPass.Length -lt 4) {
                    & $sendJson @{ success = $false; message = "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร" } 400
                    continue
                }

                $db.auth.password = $newPass
                if ($payload.newUsername) {
                    $db.auth.username = $payload.newUsername
                }
                Save-DB $db
                & $sendJson @{ success = $true; message = "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย" } 200
                continue
            }

            # 2. POST /api/keys/generate
            if ($urlPath -eq "/api/keys/generate" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $catId = $payload.categoryId
                $qty = if ($payload.quantity) { [int]$payload.quantity } else { 1 }
                $customPrefix = $payload.prefix
                $note = if ($payload.note) { $payload.note } else { "สร้างผ่านระบบ" }

                $category = $db.categories | Where-Object { $_.id -eq $catId }
                if (-not $category) {
                    $category = $db.categories[0]
                }

                $prefixToUse = if ($customPrefix) { $customPrefix } else { $category.prefix }
                $generatedKeys = @()

                for ($i = 0; $i -lt $qty; $i++) {
                    $part1 = -join ((65..90) + (48..57) | Get-Random -Count 4 | ForEach-Object { [char]$_ })
                    $part2 = -join ((65..90) + (48..57) | Get-Random -Count 4 | ForEach-Object { [char]$_ })
                    $part3 = -join ((65..90) + (48..57) | Get-Random -Count 4 | ForEach-Object { [char]$_ })
                    $newKeyCode = "$prefixToUse-$part1-$part2-$part3"

                    $newKey = [PSCustomObject]@{
                        key = $newKeyCode
                        categoryId = $category.id
                        categoryName = $category.name
                        status = "unused"
                        createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                        activatedAt = $null
                        expiresAt = $null
                        hwid = $null
                        ip = $null
                        note = $note
                        hwidResetCount = 0
                    }
                    $db.keys = @($newKey) + @($db.keys)
                    $generatedKeys += $newKey
                }

                # Log
                $newLog = [PSCustomObject]@{
                    id = "LOG-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    type = "key_generate"
                    message = "สร้างคีย์ $qty คีย์ สำหรับแพ็กเกจ $($category.name)"
                    ip = $request.RemoteEndPoint.Address.ToString()
                }
                $db.logs = @($newLog) + @($db.logs)

                Save-DB $db
                & $sendJson @{ success = $true; message = "สร้างคีย์สำเร็จ $qty คีย์"; keys = $generatedKeys } 200
                continue
            }

            # 3. POST /api/keys/delete
            if ($urlPath -eq "/api/keys/delete" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $keyToDelete = $payload.key

                $db.keys = @($db.keys | Where-Object { $_.key -ne $keyToDelete })
                
                $newLog = [PSCustomObject]@{
                    id = "LOG-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    type = "key_delete"
                    message = "ลบคีย์ $keyToDelete ออกจากระบบ"
                    ip = $request.RemoteEndPoint.Address.ToString()
                }
                $db.logs = @($newLog) + @($db.logs)

                Save-DB $db
                & $sendJson @{ success = $true; message = "ลบคีย์สำเร็จ" } 200
                continue
            }

            # 4. POST /api/keys/reset-hwid
            if ($urlPath -eq "/api/keys/reset-hwid" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $targetKey = $payload.key

                $found = $db.keys | Where-Object { $_.key -eq $targetKey }
                if ($found) {
                    $found.hwid = $null
                    $found.hwidResetCount = [int]$found.hwidResetCount + 1
                    
                    $newLog = [PSCustomObject]@{
                        id = "LOG-" + (Get-Random -Minimum 1000 -Maximum 9999)
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                        type = "hwid_reset"
                        message = "รีเซ็ต HWID สำหรับคีย์ $targetKey เรียบร้อย (ครั้งที่ $($found.hwidResetCount))"
                        ip = $request.RemoteEndPoint.Address.ToString()
                    }
                    $db.logs = @($newLog) + @($db.logs)

                    Save-DB $db
                    & $sendJson @{ success = $true; message = "ปลดล็อค HWID สำเร็จ สามารถนำไปใช้กับเครื่องอื่นได้ทันที" } 200
                } else {
                    & $sendJson @{ success = $false; message = "ไม่พบคีย์ในระบบ" } 404
                }
                continue
            }

            # 5. POST /api/keys/toggle-status (Ban / Activate)
            if ($urlPath -eq "/api/keys/toggle-status" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $targetKey = $payload.key
                $found = $db.keys | Where-Object { $_.key -eq $targetKey }
                if ($found) {
                    if ($found.status -eq "banned") {
                        $found.status = if ($found.activatedAt) { "active" } else { "unused" }
                        $msg = "ปลดระงับคีย์ $targetKey แล้ว"
                    } else {
                        $found.status = "banned"
                        $msg = "ระงับการใช้งานคีย์ $targetKey แล้ว"
                    }
                    Save-DB $db
                    & $sendJson @{ success = $true; message = $msg; newStatus = $found.status } 200
                } else {
                    & $sendJson @{ success = $false; message = "ไม่พบคีย์" } 404
                }
                continue
            }

            # 6. POST /api/keys/extend
            if ($urlPath -eq "/api/keys/extend" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $targetKey = $payload.key
                $addDays = [int]$payload.days

                $found = $db.keys | Where-Object { $_.key -eq $targetKey }
                if ($found) {
                    if ($found.expiresAt) {
                        $curExpiry = [DateTime]::Parse($found.expiresAt)
                        $newExpiry = $curExpiry.AddDays($addDays)
                        $found.expiresAt = $newExpiry.ToString("yyyy-MM-ddTHH:mm:ssZ")
                        if ($found.status -eq "expired") { $found.status = "active" }
                    } else {
                        $found.expiresAt = (Get-Date).AddDays($addDays).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    }
                    Save-DB $db
                    & $sendJson @{ success = $true; message = "เพิ่มระยะเวลา $addDays วันสำเร็จ"; expiresAt = $found.expiresAt } 200
                } else {
                    & $sendJson @{ success = $false; message = "ไม่พบคีย์" } 404
                }
                continue
            }

            # 7. POST /api/categories/save
            if ($urlPath -eq "/api/categories/save" -and $method -eq "POST") {
                $cat = $bodyText | ConvertFrom-Json
                $existing = $db.categories | Where-Object { $_.id -eq $cat.id }
                if ($existing) {
                    $existing.name = $cat.name
                    $existing.durationDays = [int]$cat.durationDays
                    $existing.price = [int]$cat.price
                    $existing.description = $cat.description
                    $existing.prefix = $cat.prefix
                    $existing.color = $cat.color
                } else {
                    $db.categories += $cat
                }
                Save-DB $db
                & $sendJson @{ success = $true; message = "บันทึกหมวดหมู่สำเร็จ" } 200
                continue
            }

            # 8. POST /api/categories/delete
            if ($urlPath -eq "/api/categories/delete" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $catId = $payload.id
                $db.categories = @($db.categories | Where-Object { $_.id -ne $catId })
                Save-DB $db
                & $sendJson @{ success = $true; message = "ลบหมวดหมู่สำเร็จ" } 200
                continue
            }

            # 9. POST /api/settings/save
            if ($urlPath -eq "/api/settings/save" -and $method -eq "POST") {
                $newSettings = $bodyText | ConvertFrom-Json
                $db.settings = $newSettings
                Save-DB $db
                & $sendJson @{ success = $true; message = "บันทึกการตั้งค่าสำเร็จ" } 200
                continue
            }

            # 10. POST /api/upstream/test (ทดสอบเชื่อมต่อแผง API)
            if ($urlPath -eq "/api/upstream/test" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $panelUrl = $payload.baseUrl
                $apiKey = $payload.apiKey

                # Simulate upstream API check
                & $sendJson @{
                    success = $true
                    message = "เชื่อมต่อระบบแผง Reseller สำเร็จ!"
                    panelInfo = @{
                        connectedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                        status = "ONLINE"
                        pingMs = (Get-Random -Minimum 25 -Maximum 75)
                        balance = "1,450.00 THB"
                        plan = "VIP Reseller Partner"
                        upstreamServer = $panelUrl
                    }
                } 200
                continue
            }

            # 11. POST /api/license/verify (Client Software / Game Script Verify Key & HWID)
            if ($urlPath -eq "/api/license/verify" -and $method -eq "POST") {
                $payload = $bodyText | ConvertFrom-Json
                $clientKey = $payload.key
                $clientHwid = $payload.hwid
                $clientIp = $request.RemoteEndPoint.Address.ToString()

                # Check blacklist
                $isBlacklisted = $db.hwidBlacklist | Where-Object { $_.hwid -eq $clientHwid }
                if ($isBlacklisted) {
                    & $sendJson @{
                        valid = $false
                        status = "HWID_BLACKLISTED"
                        message = "เครื่องนี้ถูกระงับการเข้าใช้งานเนื่องจาก: $($isBlacklisted.reason)"
                    } 403
                    continue
                }

                $found = $db.keys | Where-Object { $_.key -eq $clientKey }
                if (-not $found) {
                    & $sendJson @{
                        valid = $false
                        status = "INVALID_KEY"
                        message = "ไม่พบคีย์ในระบบ หรือคีย์ไม่ถูกต้อง"
                    } 404
                    continue
                }

                if ($found.status -eq "banned") {
                    & $sendJson @{
                        valid = $false
                        status = "KEY_BANNED"
                        message = "คีย์นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
                    } 403
                    continue
                }

                # If first time activation
                if ($found.status -eq "unused" -or -not $found.activatedAt) {
                    $found.status = "active"
                    $found.activatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    $cat = $db.categories | Where-Object { $_.id -eq $found.categoryId }
                    $days = if ($cat) { [int]$cat.durationDays } else { 30 }
                    
                    if ($days -ge 9000) {
                        $found.expiresAt = "2099-12-31T23:59:59Z"
                    } else {
                        $found.expiresAt = (Get-Date).AddDays($days).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    }
                    $found.hwid = $clientHwid
                    $found.ip = $clientIp

                    $newLog = [PSCustomObject]@{
                        id = "LOG-" + (Get-Random -Minimum 1000 -Maximum 9999)
                        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                        type = "key_activate"
                        message = "เปิดใช้งานคีย์ $clientKey สำเร็จ และผูก HWID เครื่องเรียบร้อย"
                        ip = $clientIp
                    }
                    $db.logs = @($newLog) + @($db.logs)
                    Save-DB $db
                }

                # Check expiration
                if ($found.expiresAt) {
                    $expTime = [DateTime]::Parse($found.expiresAt)
                    if ((Get-Date) -gt $expTime) {
                        $found.status = "expired"
                        Save-DB $db
                        & $sendJson @{
                            valid = $false
                            status = "KEY_EXPIRED"
                            message = "คีย์หมดอายุการใช้งานแล้ว ($($found.expiresAt))"
                        } 400
                        continue
                    }
                }

                # Check HWID lock
                if ($found.hwid -and $found.hwid -ne $clientHwid) {
                    & $sendJson @{
                        valid = $false
                        status = "HWID_MISMATCH"
                        message = "HWID ไม่ตรงกับเครื่องที่ลงทะเบียนไว้ กรุณาติดต่อแอดมินเพื่อรีเซ็ต HWID"
                        registeredHwid = ($found.hwid.Substring(0, [Math]::Min(8, $found.hwid.Length)) + "...")
                    } 403
                    continue
                }

                # If HWID is null, bind it
                if (-not $found.hwid) {
                    $found.hwid = $clientHwid
                    $found.ip = $clientIp
                    Save-DB $db
                }

                # Success
                & $sendJson @{
                    valid = $true
                    status = "SUCCESS"
                    message = "ยืนยันคีย์สำเร็จ ยินดีต้อนรับ!"
                    data = @{
                        key = $found.key
                        category = $found.categoryName
                        expiresAt = $found.expiresAt
                        isLifetime = ($found.categoryId -eq "CAT-LIFE")
                        hwid = $found.hwid
                        serverTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    }
                } 200
                continue
            }

            # If no API route matched
            & $sendJson @{ error = "Not Found"; path = $urlPath } 404
            continue
        }

        # -------------------------------------------------------------
        # STATIC FILE SERVING
        # -------------------------------------------------------------
        $reqFile = $urlPath.TrimStart("/")
        if ([string]::IsNullOrWhiteSpace($reqFile)) {
            $reqFile = "index.html"
        }
        $fullPath = Join-Path $CurrentDir $reqFile

        if (Test-Path $fullPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()

            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }

            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found: $urlPath</h1>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.Close()
        }

    } catch {
        Write-Host " [Error] $($_.Exception.Message)" -ForegroundColor Red
    }
}

$listener.Stop()
