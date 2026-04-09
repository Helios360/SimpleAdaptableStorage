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

Pour voir les logs du container : sudo docker logs -f simplepeoplestoring-app-1

!!! supprimer la base de donnée : sudo docker volume rm simplepeoplestoring_db-data !!!

II/ Stockage et base de donnée
Ne jamais reconstruire avec le -v flag !!

Pour acceder a la bdd il faut etre dans le dir du projet puis
    mysql -h 127.0.0.1 -P 3307 -u root -p main
    Cette commande permet d'acceder a la console mysql du docker, elle est pérsitente a travers les reboot (normalement)
    Tu peux faire ce que tu veux dessus comme des backups lolilol

POUR TOUT RESET :
sudo rm -rf dev
sudo docker compose down -v --remove-orphans
sudo docker compose up --build -d
(en dev) sudo docker compose -f docker-compose.override.yml up --build -d
Pour créer des tests:
CREATE TABLE IF NOT EXISTS Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200),
    answer VARCHAR(1000),
    type TINYINT,
    exemple VARCHAR(500),
    hint VARCHAR(255),
    difficulty TINYINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Make multiple Tests creation queries
5 Tests about frontend = 1
5 Tests about backend = 2
5 Psychotechnical Tests = 3
In 3 difficulties
1 = easy 
2 = medium
3 = hard

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the purpose of the "alt" attribute in HTML?',
'The "alt" attribute provides alternative text for an image if it cannot be displayed, and is also used by screen readers for accessibility.',
1,
1);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('How do you center a div horizontally and vertically using CSS?',
'Use `display: flex; justify-content: center; align-items: center;` on the parent element.',
1,
2);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the difference between "==" and "===" in JavaScript?',
'"==" checks for equality after type conversion, while "===" checks for strict equality without type conversion.',
1,
3);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the Virtual DOM in React?',
'The Virtual DOM is a lightweight copy of the real DOM, used by React to improve performance by minimizing direct DOM updates.',
1,
1);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the purpose of the "useEffect" hook in React?',
'The "useEffect" hook allows you to perform side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM.',
1,
2);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the difference between GET and POST HTTP methods?',
'GET is used to request data from a specified resource, while POST is used to send data to a server to create or update a resource.',
2,
1);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is middleware in Express.js?',
'Middleware are functions that have access to the request and response objects, and the next middleware function in the application’s request-response cycle.',
2,
2);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is SQL injection and how can it be prevented?',
'SQL injection is a code injection technique that might destroy your database. It can be prevented by using prepared statements and parameterized queries.',
2,
3);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the purpose of JWT in authentication?',
'JWT (JSON Web Token) is used to securely transmit information between parties as a JSON object, often used for authentication and authorization.',
2,
2);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the difference between REST and GraphQL?',
'REST is an architectural style for designing networked applications, while GraphQL is a query language for APIs and a runtime for fulfilling those queries with existing data.',
2,
3);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('If you rearrange the letters "CIFAIPC" you would have the name of a:',
'Ocean (Pacific)',
3,
1);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What number should come next in this pattern? 1, 1, 2, 3, 5, 8, 13, ...',
'21 (Fibonacci sequence)',
3,
2);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('Which one of the following does not belong: Apple, Orange, Banana, Carrot?',
'Carrot (it is a vegetable, not a fruit)',
3,
1);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies. True or False?',
'True',
3,
3);

INSERT INTO Tests (question, answer, type, difficulty)
VALUES
('What is the missing number in the sequence: 2, 6, 12, 20, 30, ...?',
'42 (n² + n)',
3,
3);

pour des users -----------------------------------------

INSERT INTO Users (
    name, fname, email, tel, addr, city, postal, birth, cv, id_doc, id_doc_verso, password, permis, vehicule, mobile, consent, terms_version, tags, skills, status, is_admin
) VALUES
('Smith', 'John', 'john.smith@example.com', '+1234567890', '123 Main St', 'New York', '10001', '1985-05-15', 'john_smith_cv.pdf', 'john_smith_id_front.jpg', 'john_smith_id_back.jpg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 1, 1, 1, '["premium"]', '["driving", "cooking"]', 1, 0),
('Doe', 'Jane', 'jane.doe@example.com', '+1987654321', '456 Oak Ave', 'Los Angeles', '90001', '1990-08-22', 'jane_doe_cv.pdf', 'jane_doe_id_front.jpg', 'jane_doe_id_back.jpg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0, 0, 1, 1, 1, '["standard"]', '["writing", "photography"]', 1, 0),
('Johnson', 'Michael', 'michael.j@example.com', '+1456789012', '789 Pine Rd', 'Chicago', '60601', '1982-11-30', NULL, 'michael_j_id_front.jpg', NULL, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 0, 1, 1, 1, NULL, '["sales", "marketing"]', 1, 0),
('Williams', 'Emily', 'emily.w@example.com', '+1789012345', '321 Elm Blvd', 'Houston', '77001', '1995-03-10', 'emily_w_cv.pdf', NULL, NULL, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0, 1, 0, 1, 1, '["premium"]', '["teaching", "music"]', 1, 0),
('Brown', 'David', 'david.b@example.com', '+1321654987', '654 Cedar Ln', 'Phoenix', '85001', '1988-07-19', 'david_b_cv.pdf', 'david_b_id_front.jpg', 'david_b_id_back.jpg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 1, 1, 1, '["standard"]', '["programming", "design"]', 1, 0),
('Jones', 'Sarah', 'sarah.j@example.com', '+1654987321', '987 Maple Dr', 'Philadelphia', '19101', '1993-09-05', NULL, 'sarah_j_id_front.jpg', NULL, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0, 0, 1, 1, 1, NULL, '["nursing", "first aid"]', 1, 0),
('Garcia', 'Carlos', 'carlos.g@example.com', '+1987321654', '135 Birch St', 'San Antonio', '78201', '1980-12-25', 'carlos_g_cv.pdf', 'carlos_g_id_front.jpg', 'carlos_g_id_back.jpg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 1, 1, 1, '["premium"]', '["construction", "plumbing"]', 1, 0),
('Miller', 'Lisa', 'lisa.m@example.com', '+1321987654', '246 Spruce Ave', 'San Diego', '92101', '1991-04-17', 'lisa_m_cv.pdf', NULL, NULL, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0, 0, 1, 1, 1, '["standard"]', '["accounting", "finance"]', 1, 0),
('Davis', 'Robert', 'robert.d@example.com', '+1654321987', '369 Willow Rd', 'Dallas', '75201', '1987-06-30', NULL, 'robert_d_id_front.jpg', 'robert_d_id_back.jpg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 1, 1, 1, NULL, '["logistics", "management"]', 1, 0),
('Rodriguez', 'Maria', 'maria.r@example.com', '+1789654321', '482 Redwood Ln', 'San Jose', '95101', '1994-02-14', 'maria_r_cv.pdf', 'maria_r_id_front.jpg', 'maria_r_id_back.jpg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0, 1, 0, 1, 1, '["premium"]', '["education", "coaching"]', 1, 0);



III/ Regen de CA
(Don't forget CA regen is made in http not https)
sudo docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d {nomDeDomaine} --email {adresseMail} --agree-tos --no-eff-email