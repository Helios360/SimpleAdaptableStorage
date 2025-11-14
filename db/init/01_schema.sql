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
    permis BOOLEAN DEFAULT FALSE,
    vehicule BOOLEAN DEFAULT FALSE,
    mobile BOOLEAN DEFAULT FALSE,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags JSON,
    skills JSON,
    status TINYINT DEFAULT 1,
    is_admin TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200),
    answer VARCHAR(1000),
    type TINYINT,
    exemple VARCHAR(500),
    hint VARCHAR(255),
    difficulty TINYINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS TestAttempts (
    user_id INT NOT NULL,
    test_id INT NOT NULL,
    response TEXT,
    score INT,
    creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES Tests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;