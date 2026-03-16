#!/bin/bash

DOCKERFLAG="--build"
if [[ $# -eq 1 && $1 = "--no-build" ]]; then
	echo "Using existing docker images"
	DOCKERFLAG=""
elif [[ $# -ne 0 ]]; then
	echo "Bad args"; exit 1
fi

trap "docker compose -f ./docker-compose.yml down" EXIT
docker compose -f ./docker-compose.yml up ${DOCKERFLAG}