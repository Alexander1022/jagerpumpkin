#!/bin/sh
#ALPINE DOES NOT HAVE BASH

ENV_FILE="/app/.env"
HOSTNAME_FILE="/var/lib/tor/hidden_service/hostname"

while [ ! -f "$HOSTNAME_FILE" ]; do
    echo "Waiting for Tor hidden service hostname file..."
    sleep 1
done

HOSTNAME=$(cat "$HOSTNAME_FILE")

echo "VITE_API_URL=http://$HOSTNAME" > "$ENV_FILE"
echo "Starting client with command: $@"
exec "$@"