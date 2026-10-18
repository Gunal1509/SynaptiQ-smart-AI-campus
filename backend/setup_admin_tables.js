const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    console.log('Running SYNAPTIQ Admin Portal Database Migration...');

    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'Gunal@15',
        database: process.env.MYSQL_DATABASE || 'campus',
    });

    console.log('Connected to MySQL `campus` database.');

    // 1. Check existing columns in users
    const [columns] = await connection.query('SHOW COLUMNS FROM users');
    const existingColNames = columns.map(c => c.Field.toLowerCase());

    if (!existingColNames.includes('role')) {
        console.log('Adding column `role` to `users`...');
        await connection.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'student'");
    }
    if (!existingColNames.includes('status')) {
        console.log('Adding column `status` to `users`...');
        await connection.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'approved'");
    }
    if (!existingColNames.includes('created_at')) {
        console.log('Adding column `created_at` to `users`...');
        await connection.query("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }
    if (!existingColNames.includes('last_login')) {
        console.log('Adding column `last_login` to `users`...');
        await connection.query("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL");
    }

    // 2. Login Activity Table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS login_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            email VARCHAR(255) NOT NULL,
            ip_address VARCHAR(100) NULL,
            user_agent TEXT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'success',
            login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('Verified table: `login_activity`');

    // 3. Notifications Table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_email VARCHAR(255) DEFAULT 'admin@synaptiq.edu',
            recipient_email VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('Verified table: `notifications`');

    // 4. Announcements Table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            category VARCHAR(100) DEFAULT 'General',
            priority VARCHAR(20) DEFAULT 'medium',
            is_pinned BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            author VARCHAR(255) DEFAULT 'Campus Admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);
    console.log('Verified table: `announcements`');

    // 5. System Settings Table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL,
            description VARCHAR(255) NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);
    console.log('Verified table: `system_settings`');

    // Seed default settings
    const defaultSettings = [
        ['require_admin_approval', 'false', 'Require admin to approve new student registrations before login'],
        ['allow_signups', 'true', 'Allow public registration on signup page'],
        ['maintenance_mode', 'false', 'Put portal in maintenance mode (only admins can access)'],
        ['announcement_banner_enabled', 'true', 'Show announcements banner on student dashboard']
    ];

    for (const [key, val, desc] of defaultSettings) {
        await connection.query(`
            INSERT IGNORE INTO system_settings (setting_key, setting_value, description)
            VALUES (?, ?, ?)
        `, [key, val, desc]);
    }

    // Set primary admin
    await connection.query(`
        UPDATE users SET role = 'admin', status = 'approved'
        WHERE email = 'sivagunal15@gmail.com'
    `);

    // Ensure all other existing users have status='approved' and role='student' if null
    await connection.query(`
        UPDATE users SET status = 'approved' WHERE status IS NULL OR status = ''
    `);
    await connection.query(`
        UPDATE users SET role = 'student' WHERE (role IS NULL OR role = '') AND email != 'sivagunal15@gmail.com'
    `);

    // Seed initial announcement
    const [existingAnnouncements] = await connection.query('SELECT id FROM announcements LIMIT 1');
    if (existingAnnouncements.length === 0) {
        await connection.query(`
            INSERT INTO announcements (title, content, category, priority, is_pinned, is_active, author)
            VALUES (
                'Welcome to SYNAPTIQ 2.0 Academic Portal',
                'Welcome students and faculty! The AI-powered Campus Copilot, RAG syllabus assistant, and Exam Readiness modules are now live. Check your timetable and uploaded course materials.',
                'General',
                'high',
                TRUE,
                TRUE,
                'Chief Administrator'
            )
        `);
        console.log('Seeded welcome announcement.');
    }

    console.log('\n[SUCCESS] Admin portal database setup completed successfully!');
    const [users] = await connection.query('SELECT id, name, email, role, status FROM users');
    console.log('\nCurrent Registered Users:');
    console.table(users);

    await connection.end();
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
