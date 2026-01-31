sudo rm -rf dev
sudo docker compose down -v --remove-orphans
sudo docker compose -f docker-compose.override.yml up --build -d
sudo docker logs -f simplepeoplestoring-mysql-1
sudo docker logs -f simplepeoplestoring-app-1