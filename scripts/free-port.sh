#!/usr/bin/env bash
# Kills any process currently bound to the given TCP port(s) so a dev server
# restart doesn't fail with EADDRINUSE while the previous process's socket
# is still being released. Never fails the calling script.

for port in "$@"; do
  pid=$(lsof -ti "tcp:${port}" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "[free-port] killing PID(s) $pid on port $port"
    kill -9 $pid 2>/dev/null
  fi
done

exit 0
