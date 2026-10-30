#!/usr/bin/env bash
# Cursor pode deixar vários @browsermcp/mcp presos na porta 9009 → "0 tools enabled".
pkill -9 -f 'mcp-server-browsermcp' 2>/dev/null || true
pkill -9 -f '@browsermcp/mcp/dist/index.js' 2>/dev/null || true
if command -v cmd.exe >/dev/null 2>&1; then
  cmd.exe /c "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :9009 ^| findstr LISTENING') do taskkill /F /PID %a" 2>/dev/null || true
fi
echo "browsermcp cleanup done"
