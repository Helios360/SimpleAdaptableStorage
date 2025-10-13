Salut jeune dev de Cloud Campus voici comment mettre en place l'image du site :
    NORMALEMENT le fichier install.sh devrait être suffisant . . .

I/ Créer un fichier .env sous cette forme :

PORT=3000
HOST=0.0.0.0

MYSQL_HOST=mysql
MYSQL_USER=mysql
MYSQL_DATABASE=$DB_NAME
MYSQL_PASSWORD=$PASS
MYSQL_ROOT_PASSWORD=$ROOT_PASS

JWT_SECRET=$SECRET
OPENAI_API_KEY=$API

Evidement tout est modifiable pour peut que tu modifies les bonnes variables dans le serveur node est la config docker

Démarer le service : sudo docker compose --build

Fermer le service : sudo docker compose down (ex: Change .env)

Redemarer l'app seulement : 
    >>> docker compose stop app
    >>> docker compose rm -f app
    >>> docker compose up -d app

!!! supprimer la base de donnée : sudo docker volume rm simplepeoplestoring_db-data !!!

II/ Stockage et base de donnée
Ne jamais reconstruire avec le -v flag !!

Pour acceder a la bdd il faut etre dans le dir du projet puis
    mysql -h 127.0.0.1 -P 3307 -u root -p Main
    Cette commande permet d'acceder a la console mysql du docker, elle est pérsitente a travers les reboot (normalement)
    Tu peux faire ce que tu veux dessus comme des backups lolilol