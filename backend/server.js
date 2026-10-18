require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || "synaptiqsecret2026";

app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MySQL Connection Pool for high performance and auto-reconnect
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Gunal@15',
    database: process.env.MYSQL_DATABASE || 'campus',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0
});

const promiseDb = pool.promise();

// Check MySQL connection
pool.getConnection((err, conn) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
    } else {
        console.log('Connected to MySQL database via connection pool');
        conn.release();
    }
});

// MongoDB Connection for Admin Data Viewer and File Stats
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const mongoClient = new MongoClient(mongoUri);
let mongoDb = null;

mongoClient.connect().then(() => {
    mongoDb = mongoClient.db(process.env.MONGODB_DB || "ai_campus");
    console.log("Connected to MongoDB for Admin data services");
}).catch(err => {
    console.warn("MongoDB connection warning in server.js:", err.message);
});

// Helper: Extract client IP & User-Agent
const getClientInfo = (req) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = rawIp.split(',')[0].trim().replace(/^.*:/, '');
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    return { ip: ip || '127.0.0.1', userAgent };
};

// Helper: Log Login Activity
const recordLoginActivity = async (email, status, userId, req) => {
    try {
        const { ip, userAgent } = getClientInfo(req);
        await promiseDb.query(
            'INSERT INTO login_activity (user_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
            [userId || null, email, ip, userAgent, status]
        );
    } catch (e) {
        console.error('Failed to record login activity:', e.message);
    }
};

// Helper: Get System Setting
const getSystemSetting = async (key, fallback = 'false') => {
    try {
        const [rows] = await promiseDb.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
        if (rows && rows.length > 0) {
            return rows[0].setting_value;
        }
        return fallback;
    } catch (e) {
        return fallback;
    }
};

// ==========================================
// MIDDLEWARE
// ==========================================

// Authenticate JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. Authentication token required.' });
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
        }
        
        // Fresh verification of status & role from DB
        try {
            const [users] = await promiseDb.query('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.id]);
            if (!users || users.length === 0) {
                return res.status(401).json({ message: 'User account not found.' });
            }
            const user = users[0];
            if (user.status === 'suspended') {
                return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
            }
            req.user = user;
            next();
        } catch (dbErr) {
            req.user = decoded;
            next();
        }
    });
};

// Require Administrator Role
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Administrator privileges required.' });
    }
    next();
};

// ==========================================
// PUBLIC & AUTHENTICATION ENDPOINTS
// ==========================================

// System Status (Public)
app.get('/system-status', async (req, res) => {
    try {
        const [settings] = await promiseDb.query('SELECT setting_key, setting_value FROM system_settings');
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.setting_key] = s.setting_value;
        });
        res.json({
            maintenance_mode: settingsMap.maintenance_mode === 'true',
            allow_signups: settingsMap.allow_signups !== 'false',
            require_admin_approval: settingsMap.require_admin_approval === 'true',
            announcement_banner_enabled: settingsMap.announcement_banner_enabled !== 'false'
        });
    } catch (e) {
        res.json({
            maintenance_mode: false,
            allow_signups: true,
            require_admin_approval: false,
            announcement_banner_enabled: true
        });
    }
});

// Verify Token Endpoint
app.get('/verify-token', authenticateToken, (req, res) => {
    return res.status(200).json({ valid: true, user: req.user });
});

// Register / Signup
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    try {
        // Check if signups are currently allowed
        const allowSignups = await getSystemSetting('allow_signups', 'true');
        if (allowSignups === 'false') {
            return res.status(403).json({ message: 'Student registration is currently closed by the administrator.' });
        }

        // Check if user already exists
        const [existing] = await promiseDb.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing && existing.length > 0) {
            return res.status(409).json({ message: 'An account with this email address already exists.' });
        }

        const securepass = await bcrypt.hash(password, 10);
        
        // Check if admin approval is required
        const requireApproval = await getSystemSetting('require_admin_approval', 'false');
        const status = (requireApproval === 'true') ? 'pending' : 'approved';
        const role = 'student';

        const [result] = await promiseDb.query(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, securepass, role, status]
        );

        if (status === 'pending') {
            return res.status(201).json({
                message: 'Account registered successfully! Your account is pending administrator approval before you can log in.',
                requiresApproval: true,
                user: { id: result.insertId, name, email, role, status }
            });
        }

        // Auto-approved: issue JWT token
        const token = jwt.sign(
            { id: result.insertId, email, name, role, status },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.insertId, name, email, role, status }
        });

    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ message: 'Internal server error during registration.' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    try {
        const [result] = await promiseDb.query('SELECT * FROM users WHERE email = ?', [email]);

        if (!result || result.length === 0) {
            await recordLoginActivity(email, 'user_not_found', null, req);
            return res.status(401).json({ message: 'No account found with this email address.' });
        }

        const user = result[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            await recordLoginActivity(email, 'failed_password', user.id, req);
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }

        // Check Maintenance Mode
        const maintenanceMode = await getSystemSetting('maintenance_mode', 'false');
        if (maintenanceMode === 'true' && user.role !== 'admin') {
            await recordLoginActivity(email, 'maintenance_blocked', user.id, req);
            return res.status(503).json({
                message: 'The Campus Portal is currently undergoing scheduled system maintenance. Please check back shortly.'
            });
        }

        // Check Account Approval Status
        if (user.status === 'pending') {
            await recordLoginActivity(email, 'pending_approval', user.id, req);
            return res.status(403).json({
                message: 'Your account is pending administrator approval. Please wait for an administrator to activate your access.'
            });
        }

        if (user.status === 'suspended') {
            await recordLoginActivity(email, 'suspended', user.id, req);
            return res.status(403).json({
                message: 'Your account has been suspended by the campus administrator.'
            });
        }

        if (user.status === 'rejected') {
            await recordLoginActivity(email, 'rejected', user.id, req);
            return res.status(403).json({
                message: 'Your registration request was declined by the administrator.'
            });
        }

        // Successful Login
        await promiseDb.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        await recordLoginActivity(email, 'success', user.id, req);

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role || 'student', status: user.status },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role || 'student',
                status: user.status
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Internal server error checking credentials.' });
    }
});

// ==========================================
// STUDENT PROFILES
// ==========================================

// Save or Update Student Profile (Protected)
app.post('/profile', authenticateToken, async (req, res) => {
    const {
        student_name,
        reg_no,
        department,
        year,
        phone,
        profile_photo
    } = req.body;

    const email = req.user.email || req.body.email;

    try {
        const [rows] = await promiseDb.query('SELECT id FROM student_profiles WHERE email = ?', [email]);

        if (rows && rows.length > 0) {
            const updateQuery = `
                UPDATE student_profiles
                SET student_name = ?, reg_no = ?, department = ?, year = ?, phone = ?, profile_photo = COALESCE(NULLIF(?, ''), profile_photo)
                WHERE email = ?
            `;
            await promiseDb.query(updateQuery, [student_name, reg_no, department, year, phone, profile_photo, email]);
            return res.json({ message: 'Profile updated successfully' });
        } else {
            const insertQuery = `
                INSERT INTO student_profiles
                (email, student_name, reg_no, department, year, phone, profile_photo)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            await promiseDb.query(insertQuery, [email, student_name, reg_no, department, year, phone, profile_photo || '']);
            return res.json({ message: 'Profile created successfully' });
        }
    } catch (err) {
        console.error('Profile error:', err);
        return res.status(500).json({ message: 'Error saving profile' });
    }
});

// Fetch Student Profile (Protected)
app.get('/profile/:email', authenticateToken, async (req, res) => {
    const email = req.params.email;

    try {
        const [result] = await promiseDb.query('SELECT * FROM student_profiles WHERE email = ?', [email]);
        if (!result || result.length === 0) {
            return res.json({});
        }
        res.json(result[0]);
    } catch (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ message: 'Error fetching profile' });
    }
});

// ==========================================
// NOTIFICATIONS (STUDENT & BROADCAST)
// ==========================================

// Get notifications for logged in user (Direct + Broadcast)
app.get('/notifications', authenticateToken, async (req, res) => {
    const email = req.user.email;
    try {
        const [rows] = await promiseDb.query(`
            SELECT * FROM notifications
            WHERE recipient_email = ? OR recipient_email = 'ALL'
            ORDER BY created_at DESC
            LIMIT 30
        `, [email]);

        const unreadCount = rows.filter(n => !n.is_read).length;

        res.json({
            notifications: rows,
            unread_count: unreadCount
        });
    } catch (e) {
        console.error('Error fetching notifications:', e);
        res.status(500).json({ message: 'Error loading notifications' });
    }
});

// Mark single notification as read
app.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await promiseDb.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
        res.json({ message: 'Notification marked as read' });
    } catch (e) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// Mark all notifications as read for current user
app.put('/notifications/read-all', authenticateToken, async (req, res) => {
    const email = req.user.email;
    try {
        await promiseDb.query(
            "UPDATE notifications SET is_read = TRUE WHERE recipient_email = ? OR recipient_email = 'ALL'",
            [email]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (e) {
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

// ==========================================
// ANNOUNCEMENTS (STUDENT FACING)
// ==========================================

// Get active announcements
app.get('/announcements', async (req, res) => {
    try {
        const [announcements] = await promiseDb.query(`
            SELECT * FROM announcements
            WHERE is_active = TRUE
            ORDER BY is_pinned DESC, created_at DESC
            LIMIT 20
        `);
        res.json(announcements);
    } catch (e) {
        console.error('Error fetching announcements:', e);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
});

// ==========================================
// ADMIN PORTAL SERVICES (REQUIRE ADMIN)
// ==========================================

// 1. Admin Overview Stats
app.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // User statistics
        const [userCounts] = await promiseDb.query(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_users,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_users,
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as student_users
            FROM users
        `);

        // Today's login stats
        const [loginCounts] = await promiseDb.query(`
            SELECT 
                COUNT(*) as total_logins,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_logins,
                SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed_logins
            FROM login_activity
            WHERE login_time >= CURDATE()
        `);

        // Total announcements & notifications
        const [announcementCount] = await promiseDb.query('SELECT COUNT(*) as count FROM announcements');
        const [notificationCount] = await promiseDb.query('SELECT COUNT(*) as count FROM notifications');

        // MongoDB stats (Uploads & Assessment Results)
        let mongoUploadCount = 0;
        let mongoAssessmentCount = 0;
        let mongoInteractionCount = 0;

        if (mongoDb) {
            try {
                mongoUploadCount = await mongoDb.collection('uploads').countDocuments();
                mongoAssessmentCount = await mongoDb.collection('assessment_results').countDocuments();
                mongoInteractionCount = await mongoDb.collection('recommendation_interactions').countDocuments();
            } catch (mErr) {
                console.warn('Mongo count warning:', mErr.message);
            }
        }

        res.json({
            users: userCounts[0] || {},
            today_logins: loginCounts[0] || {},
            counts: {
                announcements: announcementCount[0]?.count || 0,
                notifications: notificationCount[0]?.count || 0,
                uploads: mongoUploadCount,
                assessments: mongoAssessmentCount,
                recommendation_interactions: mongoInteractionCount
            }
        });
    } catch (e) {
        console.error('Error compiling admin stats:', e);
        res.status(500).json({ message: 'Error retrieving admin metrics' });
    }
});

// 2. Admin Users Management (with Profile join & search)
app.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { search, status, role } = req.query;

    try {
        let sql = `
            SELECT 
                u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login,
                p.student_name, p.reg_no, p.department, p.year, p.phone, p.profile_photo
            FROM users u
            LEFT JOIN student_profiles p ON u.email = p.email
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            sql += ' AND u.status = ?';
            params.push(status);
        }

        if (role && role !== 'all') {
            sql += ' AND u.role = ?';
            params.push(role);
        }

        if (search && search.trim()) {
            sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR p.reg_no LIKE ? OR p.department LIKE ?)';
            const q = `%${search.trim()}%`;
            params.push(q, q, q, q);
        }

        sql += ' ORDER BY u.created_at DESC';

        const [users] = await promiseDb.query(sql, params);
        res.json(users);
    } catch (e) {
        console.error('Error fetching admin users:', e);
        res.status(500).json({ message: 'Error loading users list' });
    }
});

// 3. Update User Status (Approve, Suspend, Pending, Reject)
app.put('/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['approved', 'pending', 'suspended', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        // Prevent modifying primary admin
        const [targetUser] = await promiseDb.query('SELECT email FROM users WHERE id = ?', [id]);
        if (!targetUser || targetUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (targetUser[0].email === 'sivagunal15@gmail.com') {
            return res.status(403).json({ message: 'The primary system administrator status cannot be altered.' });
        }

        await promiseDb.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: `User status successfully updated to ${status}.` });
    } catch (e) {
        console.error('Error updating status:', e);
        res.status(500).json({ message: 'Error updating user status' });
    }
});

// 4. Update User Role (Admin / Student)
app.put('/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'student'].includes(role)) {
        return res.status(400).json({ message: 'Role must be either "admin" or "student".' });
    }

    try {
        // Prevent demoting primary admin
        const [targetUser] = await promiseDb.query('SELECT email FROM users WHERE id = ?', [id]);
        if (!targetUser || targetUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (targetUser[0].email === 'sivagunal15@gmail.com' && role !== 'admin') {
            return res.status(403).json({ message: 'Cannot demote primary administrator.' });
        }

        await promiseDb.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        res.json({ message: `User role successfully updated to ${role}.` });
    } catch (e) {
        console.error('Error updating role:', e);
        res.status(500).json({ message: 'Error updating user role' });
    }
});

// 5. Delete User
app.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [targetUser] = await promiseDb.query('SELECT email FROM users WHERE id = ?', [id]);
        if (!targetUser || targetUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (targetUser[0].email === 'sivagunal15@gmail.com') {
            return res.status(403).json({ message: 'Cannot delete the primary administrator account.' });
        }
        if (targetUser[0].email === req.user.email) {
            return res.status(403).json({ message: 'You cannot delete your own active administrator account.' });
        }

        const email = targetUser[0].email;
        await promiseDb.query('DELETE FROM student_profiles WHERE email = ?', [email]);
        await promiseDb.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({ message: 'User and corresponding profile removed successfully.' });
    } catch (e) {
        console.error('Error deleting user:', e);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// 6. View Login Activity & Audit Logs
app.get('/admin/login-activity', authenticateToken, requireAdmin, async (req, res) => {
    const { status, search, limit = 100 } = req.query;

    try {
        let sql = 'SELECT * FROM login_activity WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (search && search.trim()) {
            sql += ' AND (email LIKE ? OR ip_address LIKE ?)';
            const q = `%${search.trim()}%`;
            params.push(q, q);
        }

        sql += ' ORDER BY login_time DESC LIMIT ?';
        params.push(parseInt(limit));

        const [logs] = await promiseDb.query(sql, params);
        res.json(logs);
    } catch (e) {
        console.error('Error fetching login activity:', e);
        res.status(500).json({ message: 'Error retrieving login logs' });
    }
});

// Clear login activity
app.delete('/admin/login-activity/clear', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await promiseDb.query('TRUNCATE TABLE login_activity');
        res.json({ message: 'Login activity logs cleared successfully.' });
    } catch (e) {
        res.status(500).json({ message: 'Error clearing login logs' });
    }
});

// 7. Database Explorer: View Raw Data across MySQL and MongoDB
app.get('/admin/database-data', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await promiseDb.query('SELECT id, name, email, role, status, created_at, last_login FROM users ORDER BY id DESC LIMIT 100');
        const [profiles] = await promiseDb.query('SELECT id, email, student_name, reg_no, department, year, phone FROM student_profiles ORDER BY id DESC LIMIT 100');
        const [logins] = await promiseDb.query('SELECT id, email, status, ip_address, user_agent, login_time FROM login_activity ORDER BY id DESC LIMIT 50');
        const [settings] = await promiseDb.query('SELECT * FROM system_settings');

        let mongoUploads = [];
        let mongoAssessments = [];
        let mongoInteractions = [];

        if (mongoDb) {
            try {
                mongoUploads = await mongoDb.collection('uploads').find({}).sort({ _id: -1 }).limit(50).toArray();
                mongoAssessments = await mongoDb.collection('assessment_results').find({}).sort({ _id: -1 }).limit(50).toArray();
                mongoInteractions = await mongoDb.collection('recommendation_interactions').find({}).sort({ _id: -1 }).limit(50).toArray();
            } catch (mErr) {
                console.warn('Mongo fetch warning:', mErr.message);
            }
        }

        res.json({
            mysql: {
                users,
                student_profiles: profiles,
                login_activity: logins,
                system_settings: settings
            },
            mongodb: {
                uploads: mongoUploads,
                assessment_results: mongoAssessments,
                recommendation_interactions: mongoInteractions
            }
        });
    } catch (e) {
        console.error('Error fetching database explorer data:', e);
        res.status(500).json({ message: 'Error retrieving database records' });
    }
});

// 8. Notifications Management
app.get('/admin/notifications', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [notifications] = await promiseDb.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ message: 'Error loading notifications history' });
    }
});

app.post('/admin/notifications', authenticateToken, requireAdmin, async (req, res) => {
    const { recipient_email, title, message, type = 'info' } = req.body;

    if (!recipient_email || !title || !message) {
        return res.status(400).json({ message: 'Recipient, title, and message are required.' });
    }

    try {
        const [result] = await promiseDb.query(`
            INSERT INTO notifications (sender_email, recipient_email, title, message, type)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.email || 'admin@synaptiq.edu', recipient_email, title, message, type]);

        res.status(201).json({
            message: recipient_email === 'ALL'
                ? 'Notification broadcasted to all students successfully!'
                : `Notification sent to ${recipient_email} successfully!`,
            id: result.insertId
        });
    } catch (e) {
        console.error('Error sending notification:', e);
        res.status(500).json({ message: 'Error dispatching notification' });
    }
});

app.delete('/admin/notifications/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await promiseDb.query('DELETE FROM notifications WHERE id = ?', [id]);
        res.json({ message: 'Notification removed successfully' });
    } catch (e) {
        res.status(500).json({ message: 'Error deleting notification' });
    }
});

// 9. Announcements Management
app.get('/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [announcements] = await promiseDb.query('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json(announcements);
    } catch (e) {
        res.status(500).json({ message: 'Error loading announcements' });
    }
});

app.post('/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
    const { title, content, category = 'General', priority = 'medium', is_pinned = false, is_active = true } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    try {
        const author = req.user.name || 'Campus Admin';
        const [result] = await promiseDb.query(`
            INSERT INTO announcements (title, content, category, priority, is_pinned, is_active, author)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [title, content, category, priority, !!is_pinned, !!is_active, author]);

        res.status(201).json({
            message: 'Announcement published successfully!',
            id: result.insertId
        });
    } catch (e) {
        console.error('Error creating announcement:', e);
        res.status(500).json({ message: 'Error publishing announcement' });
    }
});

app.put('/admin/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, content, category, priority, is_pinned, is_active } = req.body;

    try {
        await promiseDb.query(`
            UPDATE announcements
            SET title = ?, content = ?, category = ?, priority = ?, is_pinned = ?, is_active = ?
            WHERE id = ?
        `, [title, content, category, priority, !!is_pinned, !!is_active, id]);

        res.json({ message: 'Announcement updated successfully' });
    } catch (e) {
        console.error('Error updating announcement:', e);
        res.status(500).json({ message: 'Error updating announcement' });
    }
});

app.delete('/admin/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await promiseDb.query('DELETE FROM announcements WHERE id = ?', [id]);
        res.json({ message: 'Announcement deleted successfully' });
    } catch (e) {
        res.status(500).json({ message: 'Error deleting announcement' });
    }
});

// 10. System Settings & Website Controls
app.get('/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [settings] = await promiseDb.query('SELECT * FROM system_settings');
        res.json(settings);
    } catch (e) {
        res.status(500).json({ message: 'Error loading system settings' });
    }
});

app.put('/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    const { settings } = req.body; // Key-value object: { require_admin_approval: 'true', ... }

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ message: 'Invalid settings payload.' });
    }

    try {
        for (const [key, val] of Object.entries(settings)) {
            await promiseDb.query(
                'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
                [String(val), key]
            );
        }
        res.json({ message: 'System configuration settings updated successfully.' });
    } catch (e) {
        console.error('Error saving system settings:', e);
        res.status(500).json({ message: 'Error updating system settings' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
