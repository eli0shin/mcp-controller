@echo off
setlocal enabledelayedexpansion

if defined MCP_CONTROLLER_BIN_PATH (
    set "resolved=%MCP_CONTROLLER_BIN_PATH%"
    goto :execute
)

set "script_dir=%~dp0"
set "script_dir=%script_dir:~0,-1%"

set "resolved="
set "candidate=%script_dir%\mcp-controller-downloaded.exe"
if exist "%candidate%" (
    set "resolved=%candidate%"
    goto :execute
)

if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set "arch=x64"
) else if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set "arch=arm64"
) else (
    set "arch=x64"
)

set "name=mcp-controller-windows-!arch!"
set "current_dir=%script_dir%"

:search_loop
set "candidate=%current_dir%\dist\%name%\bin\mcp-controller.exe"
if exist "%candidate%" (
    set "resolved=%candidate%"
    goto :execute
)

for %%i in ("%current_dir%") do set "parent_dir=%%~dpi"
set "parent_dir=%parent_dir:~0,-1%"

if "%current_dir%"=="%parent_dir%" goto :not_found
set "current_dir=%parent_dir%"
goto :search_loop

:not_found
echo Failed to find mcp-controller binary for your platform >&2
exit /b 1

:execute
start /b /wait "" "%resolved%" %*
exit /b %ERRORLEVEL%
