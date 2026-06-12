#!/bin/sh
pid=$(lsof -ti:8080 2>/dev/null)
if [ -n "$pid" ]; then
  echo "Stopping existing server (PID $pid)..."
  kill -9 $pid
  sleep 1
fi
mvn spring-boot:run
