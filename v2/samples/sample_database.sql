-- Markpad Native — Sample SQL Script
-- Publisher: Vodiy

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    doc_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_path TEXT,
    extension VARCHAR(10) NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    is_dirty BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Sample Data
INSERT INTO users (username, email) VALUES 
('vodiy_dev', 'dev@vodiy.com'),
('alex_markpad', 'alex@example.com');

INSERT INTO documents (user_id, title, extension, size_bytes) VALUES
(1, 'Release_Notes.md', 'md', 4500),
(1, 'app_config.json', 'json', 1200),
(2, 'sales_report.csv', 'csv', 38000);

-- Query Recent Documents
SELECT 
    u.username,
    d.title,
    d.extension,
    d.size_bytes,
    d.updated_at
FROM documents d
JOIN users u ON d.user_id = u.user_id
WHERE d.size_bytes > 1000
ORDER BY d.updated_at DESC;
