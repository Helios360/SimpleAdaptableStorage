#!/bin/bash

echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
echo "@                         FILE REBOOT START                            @"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"

source .env
sudo rm -rf mysql_data

echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
echo "@                         FILE REBOOT DONE                             @"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n"

echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
echo "@                           DOCKER START                               @"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"

sudo docker compose down -v --remove-orphans
sudo docker compose -f docker-compose.override.yml up --build -d

echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
echo "@                           DOCKER DONE                                @"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n"

echo "@@@@@@@@@@@@@@@@@@@@@@@@@ MYSQL LOGS @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n"
sudo docker logs --tail=100 -f simplepeoplestoring-mysql-1 || true
echo
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@ APP LOGS @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n"
sudo docker logs --tail=100 -f simplepeoplestoring-app-1 || true