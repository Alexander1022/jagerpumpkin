#!/bin/bash

npm run --prefix ./client dev -- --host 127.0.0.1 --port 5173 > /dev/null 2>&1 &
FRONTEND_PID=$!

DOCKERFLAG=""
if [[ $# -eq 1 && $1 = "--build" ]]; then
	echo "Building docker images"
	DOCKERFLAG="$1"
elif [[ $# -ne 0 ]]; then
	echo "Bad args"; exit 1
fi

docker compose -f ./server/docker-compose.yml up ${DOCKERFLAG}

docker compose down
kill $FRONTEND_PID
