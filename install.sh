#!/bin/bash

echo ":D Starting installation..."

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo ":( Node.js is not installed. Please install Node.js first."
    exit 1
fi

# 2. Check if MySQL is installed
if ! command -v mysql &> /dev/null
then
    echo ":( MySQL is not installed. Please install MySQL first."
    exit 1
fi

# 3. Install npm dependencies
echo ":3 Installing dependencies..."
npm install

# 4. Ask user for MySQL credentials
read -p "OwO Enter MySQL root password: " -s MYSQL_PASSWORD
echo
read -p "UwU Enter database name (default: Main): " DB_NAME
DB_NAME=${DB_NAME:-Main}

# 5. Create database and table if needed
echo ":3 Setting up MySQL database and table..."
mysql -u root -p $MYSQL_PASSWORD <<EOF
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;
USE \`$DB_NAME\`;
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    fname VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    tel VARCHAR(20),
    addr TEXT,
    city VARCHAR(100),
    postal VARCHAR(20),
    birth DATE,
    cv VARCHAR(255),
    id_doc VARCHAR(255),
    id_doc_verso VARCHAR(255),
    password VARCHAR(100),
    agree BOOLEAN DEFAULT FALSE,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags JSON,
    skills JSON,
    status TINYINT DEFAULT 0,
    is_admin TINYINT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200),
    answer VARCHAR(1000),
    type TINYINT,
    exemple VARCHAR(500),
    hint VARCHAR(255),
    difficulty TINYINT
);
CREATE TABLE IF NOT EXISTS TestAttempts (
    user_id INT NOT NULL,
    test_id INT NOT NULL,
    response TEXT,
    score INT,
    creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES Tests(id)
);
EOF
# tests = [Frontend score/100 coef.1, Backend score/100 coef.0,70, Psychotechnical score/100 coef.1,5]
# gen_score = (F + 0.7 * B + 1.5 * P) / 3.2
if [ $? -ne 0 ]; then
  echo ":( Failed to set up database. Check your MySQL credentials and try again."
  exit 1
fi
echo ":D MySQL database '$DB_NAME' and tables are ready."

read -p "Enter a secret for .env file:" SECRET
read -p "Enter openAI API key:" API
# 6. Create .env file
echo "OwO Creating .env file..."
cat <<EOT > .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=$MYSQL_PASSWORD
DB_NAME=$DB_NAME
PORT=8080
JWT_SECRET=$SECRET
OPENAI_API_KEY=$API
EOT

# 7. Start the server
echo "O.O Starting the server..."
node index.js