#!/bin/bash

npm run --prefix ./client dev -- --host 127.0.0.1 --port 5173 > /dev/null 2>&1 &
FRONTEND_PID=$!

docker compose -f ./server/docker-compose.yml up --build

kill $FRONTEND_PID