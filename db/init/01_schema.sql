CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    fname VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    tel VARCHAR(20) NOT NULL,
    addr TEXT NULL,
    city VARCHAR(100) NOT NULL,
    postal VARCHAR(5) NULL,
    birth DATE NOT NULL,
    cv VARCHAR(255) NULL,
    id_doc VARCHAR(255) NULL,
    id_doc_verso VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    tags JSON,
    skills JSON,
    permis TINYINT(1) NOT NULL DEFAULT 0,
    vehicule TINYINT(1) NOT NULL DEFAULT 0,
    mobile TINYINT(1) NOT NULL DEFAULT 0,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    consent TINYINT(1) NOT NULL DEFAULT 0,
    terms_version INT NOT NULL,
    status ENUM('active', 'recherche', 'entreprise', 'archive') NOT NULL DEFAULT 'recherche',
    formation_id INT NOT NULL;
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    email_verify_token VARCHAR(64) NULL,
    email_verify_expires DATETIME NULL,
    role TINYINT DEFAULT 0,
    FOREIGN KEY (formation_id) REFERENCES Formations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS Formations (
    id AUTO_INCREMENT INT NOT NULL,
    code VARCHAR(50),
    name VARCHAR(100),
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS StaffSettings (
    staff_user_id INT NOT NULL,
    formation_id INT NOT NULL,
    FOREIGN KEY (staff_user_id) REFERENCES Users(id) ON DELETE CASCADE
    FOREIGN KEY (formation_id) REFERENCES Formations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200),
    answer VARCHAR(1000),
    type TINYINT,
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

INSERT INTO Formations ( code, name ) VALUES
('bts_ndrc', 'BTS NDRC'),
('tp_ntc', 'TP NTC'),
('dev_web_fs', 'Dev Web Fullstack'),
('bts_gpme', 'BTS BPME'),
('cap_aepe', 'CAP AEPE'),
('bts_optique', 'BTS Opticien Lunetier');
