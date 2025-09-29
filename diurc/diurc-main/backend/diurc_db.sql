-- SQL script to create diurc_db and club_applications table with transaction_id

-- Create database
CREATE DATABASE IF NOT EXISTS diurc_db;
USE diurc_db;

-- Create table for Join Us applications
CREATE TABLE IF NOT EXISTS club_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    interest VARCHAR(255) NOT NULL,
    experience TEXT NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
