USE main;
CREATE TABLE IF NOT EXISTS Formations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    fname VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    tel VARCHAR(32) NOT NULL,
    addr TEXT NULL,
    city VARCHAR(64) NOT NULL,
    postal VARCHAR(16) NULL,
    birth DATE NOT NULL,
    cv VARCHAR(254) NULL,
    id_doc VARCHAR(254) NULL,
    id_doc_verso VARCHAR(254) NULL,
    titre_valide DATE NULL,
    password VARCHAR(255) NOT NULL,
    tags JSON,
    skills JSON,
    permis TINYINT(1) NOT NULL DEFAULT 0,
    vehicule TINYINT(1) NOT NULL DEFAULT 0,
    mobile TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    consent TINYINT(1) NOT NULL DEFAULT 0,
    consented_at DATETIME NULL,
    terms_version INT NOT NULL DEFAULT 1,
    status ENUM('active', 'recherche', 'entreprise', 'archive') NOT NULL DEFAULT 'recherche',
    formation_id INT NOT NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    email_verify_token VARCHAR(254) NULL,
    email_verify_expires DATETIME NULL,
    email_verified_at DATETIME NULL,
    reset_pwd_token VARCHAR(64) NULL,
    reset_pwd_expires DATETIME NULL,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (formation_id) REFERENCES Formations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS StaffSettings (
    staff_user_id INT NOT NULL,
    formation_id INT NOT NULL,
    PRIMARY KEY (staff_user_id, formation_id),
    FOREIGN KEY (staff_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (formation_id) REFERENCES Formations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200) NOT NULL,
    answer VARCHAR(1000) NOT NULL,
    type TINYINT NOT NULL,
    difficulty TINYINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS TestAttempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,    
    user_id INT NOT NULL,
    test_id INT NOT NULL,
    response TEXT,
    score INT,
    creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES Tests(id) ON DELETE CASCADE,
    INDEX(user_id),
    INDEX(test_id),
    INDEX(user_id, test_id, creation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;