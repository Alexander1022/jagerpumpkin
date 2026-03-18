#!/bin/bash

if [[ ! -d "server/hidden_service" ]]; then
	echo "Creating hidden service directory..."
	mkdir -p server/hidden_service
	chmod 700 server/hidden_service
fi

if [[ ! -f "server/.env" ]]; then
	echo "Creating server .env file..."
	echo "JWT_SECRET=YourJWTSecret" > server/.env
fi

DOCKERFLAG="--build"
if [[ $# -eq 1 && $1 = "--no-build" ]]; then
	echo "Using existing docker images"
	DOCKERFLAG=""
elif [[ $# -ne 0 ]]; then
	echo "Bad args"; exit 1
fi

trap "docker compose -f ./docker-compose.yml down" EXIT
docker compose -f ./docker-compose.yml up ${DOCKERFLAG}