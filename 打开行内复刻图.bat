@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0AI±‡≈≈\repricing_gap_workflow\open_canvas.ps1"
if errorlevel 1 pause
