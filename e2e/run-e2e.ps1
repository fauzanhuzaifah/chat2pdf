# Fase 5D — E2E di windows-latest (dipanggil .github/workflows/build-windows.yml)
# Install silent NSIS → ukuran ter-instal → startup UI → sidecar → PDF/TOC/license → lifecycle.
# Bukti (screenshot, PDF, tasklist, metrik) ditulis ke -OutDir untuk di-upload sebagai artefak.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$InstallerPath,
  [string]$FixtureDir = (Join-Path $PSScriptRoot 'fixtures'),
  [string]$OutDir = (Join-Path $PSScriptRoot 'artifacts')
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$summary = [ordered]@{}

# ===== 1. Install silent (NSIS /S) =====
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $InstallerPath -ArgumentList '/S' -PassThru -Wait
$sw.Stop()
$summary['install_seconds'] = [math]::Round($sw.Elapsed.TotalSeconds, 1)
Write-Host "Installer exit=$($p.ExitCode) dalam $($summary['install_seconds']) s"

# ===== 2. Lokasi instalasi (registry uninstall → fallback LOCALAPPDATA) =====
$installDir = $null
foreach ($root in 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
                     'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
                     'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall') {
  $hit = Get-ChildItem $root -ErrorAction SilentlyContinue |
    Get-ItemProperty -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like '*Chat to PDF*' -and $_.InstallLocation } |
    Select-Object -ExpandProperty InstallLocation -First 1
  if ($hit -and (Test-Path $hit)) { $installDir = $hit; break }
}
if (-not $installDir) {
  foreach ($cand in (Join-Path $env:LOCALAPPDATA 'Programs'), $env:LOCALAPPDATA) {
    $exe = Get-ChildItem $cand -Recurse -Depth 3 -Filter '*.exe' -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notmatch '^(express-server|typst|unins)' -and
                     (Test-Path (Join-Path $_.DirectoryName 'resources')) } |
      Select-Object -First 1
    if ($exe) { $installDir = $exe.DirectoryName; break }
  }
}
if (-not $installDir) { throw 'Direktori instalasi tidak ditemukan (registry & LOCALAPPDATA)' }
Write-Host "InstallDir=$installDir"

# ===== 3. Ukuran ter-instal + exe aplikasi =====
$installedBytes = (Get-ChildItem $installDir -Recurse -File | Measure-Object Length -Sum).Sum
$summary['installed_size_mb'] = [math]::Round($installedBytes / 1MB, 1)
$appExe = Get-ChildItem $installDir -Filter '*.exe' |
  Where-Object { $_.Name -notmatch '^(express-server|typst|unins)' } | Select-Object -First 1
if (-not $appExe) { throw 'exe aplikasi tidak ditemukan di install dir' }
Write-Host "AppExe=$($appExe.FullName) | resources ada: $(Test-Path (Join-Path $installDir 'resources'))"

# ===== 4. Startup: launch → MainWindowHandle (proxy double-click → UI siap) =====
$sw.Restart()
$app = Start-Process -FilePath $appExe.FullName -PassThru
$ready = $false
for ($i = 0; $i -lt 600; $i++) {
  Start-Sleep -Milliseconds 100
  $app.Refresh()
  if ($app.HasExited) {
    Write-Host "=== APLIKASI CRASH (Exit Code: $($app.ExitCode)) ==="
    $logPath = "$env:LOCALAPPDATA\Chat to PDF\logs"
    if (Test-Path $logPath) {
        Get-ChildItem -Path $logPath -Filter "*.log" | ForEach-Object {
            Write-Host "=== ISI LOG: $($_.Name) ==="
            Get-Content $_.FullName -Tail 50
        }
    } else {
        Write-Host "Tidak ada folder logs. Memeriksa Windows Event Viewer..."
        Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2} -MaxEvents 5 | Format-List Message
    }
}
  if ($app.HasExited) { throw "app keluar prematur (code=$($app.ExitCode))" }
  if ($app.MainWindowHandle -ne 0) { $ready = $true; break }
}
$sw.Stop()
if (-not $ready) { throw 'window UI tidak muncul dalam 60 s' }
$summary['startup_seconds'] = [math]::Round($sw.Elapsed.TotalSeconds, 2)
Write-Host "UI siap dalam $($summary['startup_seconds']) s (MainWindowHandle=$($app.MainWindowHandle))"
Start-Sleep -Seconds 3  # beri waktu WebView render

# Screenshot UI (bukti visual)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$bmp.Save((Join-Path $OutDir 'ui-screenshot.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host 'Screenshot UI disimpan'

# ===== 5. Sidecar Express hidup + cari port listen-nya =====
$es = Get-Process express-server -ErrorAction SilentlyContinue
if (-not $es) { throw 'express-server.exe TIDAK berjalan (sidecar gagal spawn?)' }
$conn = Get-NetTCPConnection -OwningProcess $es[0].Id -State Listen | Select-Object -First 1
$H = "http://127.0.0.1:$($conn.LocalPort)"
$summary['sidecar_port'] = $conn.LocalPort
Write-Host "sidecar pid=$($es[0].Id) port=$($conn.LocalPort)"

# ===== 6. Health + UI terlayani dari client-dist =====
$health = Invoke-WebRequest "$H/api/health" -TimeoutSec 30
$summary['health_status'] = $health.StatusCode
$homePage = Invoke-WebRequest $H -TimeoutSec 30
$summary['ui_html_bytes'] = $homePage.Content.Length
if ($homePage.Content -notmatch 'id="app"') { throw 'HTML UI tidak mengandung marker #app' }
Write-Host "health=$($health.StatusCode) | UI served ($($homePage.Content.Length) B)"

# ===== 7. Generate PDF (payload uji Fase 3) =====
$payload = Get-Content (Join-Path $FixtureDir 'pdf-payload.json') -Raw -Encoding utf8
$r1 = Invoke-WebRequest "$H/api/generate-pdf" -Method Post -Body $payload -ContentType 'application/json' -TimeoutSec 120
[IO.File]::WriteAllBytes((Join-Path $OutDir 'out.pdf'), $r1.Content)
if ([Text.Encoding]::ASCII.GetString($r1.Content, 0, 5) -ne '%PDF-') { throw "generate-pdf bukan PDF" }
$summary['pdf_bytes'] = $r1.Content.Length
Write-Host "PDF dasar OK: $($r1.Content.Length) B"

# ===== 8. PDF dengan TOC (includeToc: true) =====
$payloadToc = Get-Content (Join-Path $FixtureDir 'pdf-toc-payload-on.json') -Raw -Encoding utf8
$r2 = Invoke-WebRequest "$H/api/generate-pdf" -Method Post -Body $payloadToc -ContentType 'application/json' -TimeoutSec 120
[IO.File]::WriteAllBytes((Join-Path $OutDir 'out-toc.pdf'), $r2.Content)
if ([Text.Encoding]::ASCII.GetString($r2.Content, 0, 5) -ne '%PDF-') { throw 'TOC PDF tidak valid' }
$summary['toc_pdf_bytes'] = $r2.Content.Length
Write-Host "TOC PDF OK: $($r2.Content.Length) B"

# ===== 9. License: tanpa key → 400; dengan key valid (HMAC dari secret CI) → valid:true =====
try {
  $lic = Invoke-WebRequest "$H/api/license/verify" -Method Post `
    -Body '{"machineId":"TEST-TEST-TEST-TEST"}' -ContentType 'application/json' -TimeoutSec 30
  throw "license tanpa key seharusnya 400, dapat $($lic.StatusCode)"
} catch [Microsoft.PowerShell.Commands.HttpResponseException] {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -ne 400) { throw "license tanpa key: harap 400, dapat $code" }
  Write-Host 'license tanpa key = 400 ✓ (sesuai perilaku)'
}
$summary['license_no_key'] = 400

if ($env:LICENSE_SECRET) {
  $key = & node -e "const c=require('crypto'),s=process.env.LICENSE_SECRET,m='TEST-TEST-TEST-TEST',e=new Date(Date.now()+365*864e5).toISOString().slice(0,10),sig=c.createHmac('sha256',s).update(m+'|1year|'+e).digest('hex').toUpperCase();console.log(m+'-1year-'+e.replaceAll('-','')+'-'+sig)"
  $lv = Invoke-WebRequest "$H/api/license/verify" -Method Post `
    -Headers @{ 'x-license-key' = $key } `
    -Body '{"machineId":"TEST-TEST-TEST-TEST"}' -ContentType 'application/json' -TimeoutSec 30
  if ($lv.Content -notmatch '"valid":\s*true') { throw "license valid-key gagal: $($lv.Content)" }
  $summary['license_valid_key'] = 'valid:true'
  Write-Host 'license valid-key = valid:true ✓ (nilai key tidak dicetak ke log)'
} else {
  Write-Host '::warning::LICENSE_SECRET tidak di-set — uji valid-key dilewati'
}

# ===== 10. Lifecycle: tutup app → express-server.exe & typst.exe harus hilang =====
tasklist /FO CSV | Out-File (Join-Path $OutDir 'tasklist-before.txt') -Encoding utf8
$app.CloseMainWindow() | Out-Null
$closed = $false
for ($i = 0; $i -lt 150; $i++) {
  Start-Sleep -Milliseconds 100
  $app.Refresh()
  if ($app.HasExited) { $closed = $true; break }
}
if (-not $closed) { throw 'app TIDAK keluar dalam 15 s setelah CloseMainWindow (lifecycle gagal)' }
Write-Host 'app keluar ✓ — menunggu sidecar berhenti'
$clean = $false
for ($i = 0; $i -lt 200; $i++) {
  Start-Sleep -Milliseconds 100
  if (-not (Get-Process express-server, typst -ErrorAction SilentlyContinue)) { $clean = $true; break }
}
$left = Get-Process express-server, typst -ErrorAction SilentlyContinue
$left | ForEach-Object { "$($_.ProcessName) pid=$($_.Id)" } |
  Out-File (Join-Path $OutDir 'processes-after-close.txt') -Encoding utf8
tasklist /FO CSV | Out-File (Join-Path $OutDir 'tasklist-after.txt') -Encoding utf8
if (-not $clean) { throw "proses masih hidup setelah close: $((($left | ForEach-Object ProcessName) -join ', '))" }
$summary['sidecar_cleanup'] = 'OK — express-server & typst hilang'
Write-Host 'express-server.exe & typst.exe berhenti saat app ditutup ✓'

# ===== Ringkasan =====
$summary | ConvertTo-Json | Out-File (Join-Path $OutDir 'e2e-summary.json') -Encoding utf8
foreach ($k in $summary.Keys) { Write-Host "METRIC $k = $($summary[$k])" }
if ($env:GITHUB_STEP_SUMMARY) {
  "| metrik | nilai |" | Out-File $env:GITHUB_STEP_SUMMARY -Encoding utf8
  "|---|---|" | Out-File $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
  foreach ($k in $summary.Keys) { "| $k | $($summary[$k]) |" | Out-File $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8 }
}
Write-Host 'E2E SELESAI — semua asser HIJAU'
