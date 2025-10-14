#!/bin/bash

echo ":D Starting minimal configuration . . ."

echo "Docker setup . . ."
sudo pacman -Syu docker docker-compose
sudo systemctl enable docker.service
sudo systemctl start docker.service
echo

read -p "Enter a db name for .env file: " DB_NAME
read -p "Enter a db password for .env file: " PASS
read -p "Enter a db root password for .env bootstraping: " ROOT_PASS

read -p "Enter a secret for .env file: " SECRET
read -p "Enter OpenAi test correction api key: " API

# Create .env file
echo "OwO Creating .env file..."
cat <<EOT > .env
PORT=3000
HOST=0.0.0.0

MYSQL_HOST=mysql
MYSQL_USER=mysql
MYSQL_DATABASE=$DB_NAME
MYSQL_PASSWORD=$PASS
MYSQL_ROOT_PASSWORD=$ROOT_PASS

JWT_SECRET=$SECRET
OPENAI_API_KEY=$API
EOT

echo "[TIPS] Don't hesitate to modify .env to suit your needs"

echo "Fresh :"
echo "  Start = docker compose up -d" 
echo "  Stop = docker compose down" 