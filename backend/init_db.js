const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Gunal@15',
  multipleStatements: true,
});

const sqlStatements = `
CREATE DATABASE IF NOT EXISTS campus;
USE campus;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    student_name VARCHAR(255),
    reg_no VARCHAR(100),
    department VARCHAR(100),
    year VARCHAR(50),
    phone VARCHAR(50),
    profile_photo LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

console.log('Connecting to MySQL Server 8.0...');

connection.connect((err) => {
  if (err) {
    console.error('MySQL Connection Error Code:', err.code);
    console.error('MySQL Error Number:', err.errno);
    console.error('MySQL Error Message:', err.message);
    console.error(err);
    process.exit(1);
  }

  console.log('Connected to MySQL successfully!');
  console.log('Executing database schema initialization...');

  connection.query(sqlStatements, (queryErr, results) => {
    if (queryErr) {
      console.error('Schema Execution Error:', queryErr.message);
      connection.end();
      process.exit(1);
    }

    console.log('Database `campus` and tables (`users`, `student_profiles`) created/verified successfully!');

    // Verify existing tables
    connection.query('SHOW TABLES IN campus;', (showErr, tables) => {
      if (!showErr) {
        console.log('Tables in database `campus`:');
        console.table(tables);
      }
      connection.end();
      console.log('Setup completed.');
    });
  });
});
