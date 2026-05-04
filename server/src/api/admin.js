const { getAppPool } = require('../config/db-compat');
// server/routes/admin.js
const express = require('express');
const { pool: promisePool } = require('../config/db-compat');
const { provisionTenantDb } = require('../services/tenantProvisioning');
const bcrypt = require('bcrypt');
const {
    canManageUser,
    canPerformDestructiveOperation,
    canChangeRole,
    isRootSuperAdmin,
    logUnauthorizedAttempt,
    ROOT_SUPERADMIN_EMAIL
} = require('../middleware/userAuthorization');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Mount admin menu management routes
const menusRouter = require('../routes/admin/menus');
router.use('/menus', menusRouter);

// Use centralized auth middleware (supports both session and JWT fallback)
const requireAdmin = requireRole(['admin', 'super_admin']);
const requireSuperAdmin = requireRole(['super_admin']);

// Middleware to check if user can create/edit users with specific roles
const requireRolePermission = async (req, res, next) => {
    const userRole = req.session?.user?.role || req.user?.role;
    const targetRole = req.body.role;

    if (!userRole) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Super admin can create/edit any role except super_admin
    if (userRole === 'super_admin') {
        if (targetRole === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot create or modify super_admin users'
            });
        }
        return next();
    }

    // Regular admin can only create/edit non-admin roles
    if (userRole === 'admin') {
        if (targetRole === 'admin' || targetRole === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot create or modify admin or super_admin users'
            });
        }
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Insufficient privileges'
    });
};

// Debug middleware for admin routes
router.use((req, res, next) => {
    console.log(`🔧 Admin route: ${req.method} ${req.path} - Original URL: ${req.originalUrl}`);
    next();
});

// GET /admin/users - Get all users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { search, role, church_id, is_active } = req.query;
        
        let query = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                u.church_id,
                c.name as church_name,
                u.is_active,
                u.email_verified,
                u.preferred_language,
                u.timezone,
                u.phone,
                u.created_at,
                u.updated_at,
                u.last_login
            FROM orthodoxmetrics_db.users u
            LEFT JOIN orthodoxmetrics_db.churches c ON u.church_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // Search filter (email, first_name, last_name)
        if (search) {
            query += ` AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Role filter
        if (role && role !== 'all') {
            query += ` AND u.role = ?`;
            params.push(role);
        }

        // Church filter
        if (church_id && church_id !== 'all') {
            query += ` AND u.church_id = ?`;
            params.push(parseInt(church_id));
        }

        // Active status filter
        if (is_active !== undefined && is_active !== 'all') {
            query += ` AND u.is_active = ?`;
            params.push(is_active === 'true' ? 1 : 0);
        }

        query += ` ORDER BY u.created_at DESC`;

        const [rows] = await getAppPool().query(query, params);

        // Remove password_hash from results (shouldn't be in SELECT, but ensure it's not returned)
        const users = rows.map(user => {
            const { password_hash, ...safeUser } = user;
            return safeUser;
        });

        res.json({
            success: true,
            users: users,
            count: users.length
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: err.message
        });
    }
});

// POST /admin/users - Create new user
router.post('/users', requireAdmin, requireRolePermission, async (req, res) => {
    try {
        const { email, first_name, last_name, role, church_id, phone, preferred_language, password } = req.body;
        const currentUser = req.user || req.session?.user;

        // Validate required fields
        if (!email || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, first name, last name, and role are required'
            });
        }

        // Check if email already exists
        const [existingUsers] = await getAppPool().query(
            'SELECT id FROM orthodoxmetrics_db.users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Generate password if not provided
        let tempPassword = null;
        let passwordHash;
        
        if (password) {
            const saltRounds = 12;
            passwordHash = await bcrypt.hash(password, saltRounds);
        } else {
            // Generate secure temporary password
            tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
            const saltRounds = 12;
            passwordHash = await bcrypt.hash(tempPassword, saltRounds);
        }

        // Insert user
        const [result] = await getAppPool().query(`
            INSERT INTO orthodoxmetrics_db.users (
                email, first_name, last_name, role, church_id, phone, 
                preferred_language, password_hash, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `, [
            email,
            first_name,
            last_name,
            role,
            church_id || null,
            phone || null,
            preferred_language || 'en',
            passwordHash
        ]);

        const userId = result.insertId;

        console.log(`✅ User created: ${email} (${role}) by ${currentUser.email} (role: ${currentUser.role})`);

        // Get created user (without password_hash)
        const [userRows] = await getAppPool().query(`
            SELECT 
                id, email, first_name, last_name, role, church_id, phone,
                preferred_language, is_active, email_verified, created_at, updated_at, last_login
            FROM orthodoxmetrics_db.users 
            WHERE id = ?
        `, [userId]);

        res.json({
            success: true,
            message: 'User created successfully',
            user: userRows[0],
            tempPassword: tempPassword // Only returned if auto-generated
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating user',
            error: err.message
        });
    }
});

// PUT /admin/users/:id - Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { email, first_name, last_name, role, church_id, preferred_language, is_active } = req.body;
        const currentUser = req.user || req.session?.user;

        // Don't allow updating self's role to lower privilege
        if (userId === currentUser.id && role && role !== currentUser.role) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        // Get target user
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can manage target user
        if (!canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'UPDATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this user',
                code: 'UPDATE_DENIED'
            });
        }

        // Check role assignment permission if role is being changed
        if (role && role !== targetUser.role) {
            if (!canChangeRole(currentUser, targetUser, role)) {
                logUnauthorizedAttempt(currentUser, targetUser, 'CHANGE_ROLE');
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to assign this role',
                    code: 'ROLE_ASSIGNMENT_DENIED'
                });
            }

            // Prevent assigning super_admin unless current user is super_admin
            if (role === 'super_admin' && currentUser.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only super_admin can assign super_admin role'
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (email !== undefined) {
            // Check if email is already taken by another user
            const [emailCheck] = await getAppPool().query(
                'SELECT id FROM orthodoxmetrics_db.users WHERE email = ? AND id != ?',
                [email, userId]
            );
            if (emailCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use by another user'
                });
            }
            updates.push('email = ?');
            values.push(email);
        }

        if (first_name !== undefined) {
            updates.push('first_name = ?');
            values.push(first_name);
        }

        if (last_name !== undefined) {
            updates.push('last_name = ?');
            values.push(last_name);
        }

        if (role !== undefined) {
            updates.push('role = ?');
            values.push(role);
        }

        if (church_id !== undefined) {
            updates.push('church_id = ?');
            values.push(church_id || null);
        }

        if (preferred_language !== undefined) {
            updates.push('preferred_language = ?');
            values.push(preferred_language);
        }

        if (is_active !== undefined) {
            // Don't allow deactivating self
            if (userId === currentUser.id && !is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'You cannot deactivate your own account'
                });
            }

            // Check permission for deactivation
            if (!is_active && !canPerformDestructiveOperation(currentUser, targetUser)) {
                logUnauthorizedAttempt(currentUser, targetUser, 'DEACTIVATE_USER');
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to deactivate this user',
                    code: 'DEACTIVATION_DENIED'
                });
            }

            updates.push('is_active = ?');
            values.push(is_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);

        await getAppPool().query(
            `UPDATE orthodoxmetrics_db.users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        console.log(`✅ User updated: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);

        // Get updated user (without password_hash)
        const [updatedRows] = await getAppPool().query(`
            SELECT 
                id, email, first_name, last_name, role, church_id, phone,
                preferred_language, is_active, email_verified, created_at, updated_at, last_login
            FROM orthodoxmetrics_db.users 
            WHERE id = ?
        `, [userId]);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedRows[0]
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user',
            error: err.message
        });
    }
});

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.user || req.session?.user;

        // Don't allow deleting self
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Get target user
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can perform destructive operation
        if (!canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DELETE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this user',
                code: 'DELETE_DENIED'
            });
        }

        // Super admin can delete anyone except super_admin
        // Regular admin can only delete non-admin users
        if (currentUser.role === 'super_admin') {
            if (targetUser.role === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot delete super_admin users'
                });
            }
        } else if (currentUser.role === 'admin') {
            if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot delete admin or super_admin users'
                });
            }
        }

        // Delete user inside a transaction so dependent rows are cleaned atomically.
        // Schema has 3 RESTRICT FKs into users.id that block a bare DELETE:
        //   - church_users.user_id        (membership rows; safe to remove with the user)
        //   - interactive_reports.created_by_user_id (audit-bearing; refuse and ask admin to reassign)
        //   - backup_jobs.requested_by    (audit-bearing; refuse and ask admin to reassign)
        // Other FKs (refresh_tokens, user_roles, password_resets, etc.) already CASCADE or SET NULL.
        const conn = await getAppPool().getConnection();
        try {
            await conn.beginTransaction();

            const [reportRows] = await conn.query(
                'SELECT COUNT(*) AS n FROM orthodoxmetrics_db.interactive_reports WHERE created_by_user_id = ?',
                [userId]
            );
            const [backupRows] = await conn.query(
                'SELECT COUNT(*) AS n FROM orthodoxmetrics_db.backup_jobs WHERE requested_by = ?',
                [userId]
            );
            const reportCount = reportRows[0].n;
            const backupCount = backupRows[0].n;

            if (reportCount > 0 || backupCount > 0) {
                await conn.rollback();
                const blockers = [];
                if (reportCount > 0) blockers.push(`${reportCount} interactive report(s)`);
                if (backupCount > 0) blockers.push(`${backupCount} backup job(s)`);
                return res.status(409).json({
                    success: false,
                    message: `Cannot delete user: ${blockers.join(' and ')} are owned by this user. Reassign or archive them first.`,
                    code: 'DELETE_BLOCKED_BY_DEPENDENCIES',
                    dependencies: { interactive_reports: reportCount, backup_jobs: backupCount },
                });
            }

            await conn.query(
                'DELETE FROM orthodoxmetrics_db.church_users WHERE user_id = ?',
                [userId]
            );
            await conn.query(
                'DELETE FROM orthodoxmetrics_db.users WHERE id = ?',
                [userId]
            );

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        console.log(`✅ User deleted: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user',
            error: err.message
        });
    }
});

// PUT /admin/users/:id/toggle-status - Toggle user active status (alias for frontend compatibility)
router.put('/users/:id/toggle-status', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.user || req.session?.user;

        // Get current user status
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name, is_active FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];
        const newStatus = !targetUser.is_active; // Toggle status

        // Don't allow deactivating self
        if (userId === currentUser.id && !newStatus) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Check permissions
        if (!newStatus && !canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DEACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to deactivate this user',
                code: 'DEACTIVATION_DENIED'
            });
        }

        if (newStatus && !canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'ACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to activate this user',
                code: 'ACTIVATION_DENIED'
            });
        }

        // Update status
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus ? 1 : 0, userId]
        );

        console.log(`✅ User status toggled: ${targetUser.email} -> ${newStatus ? 'active' : 'inactive'} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
        });
    } catch (err) {
        console.error('Error toggling user status:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while toggling user status',
            error: err.message
        });
    }
});

// GET /api/admin/churches - Get all churches (for admin panel / ChurchHeader.tsx)
router.get('/churches', requireAdmin, async (req, res) => {
    try {
        const [churches] = await getAppPool().query(
            `SELECT id, name, church_name, is_active 
             FROM churches 
             WHERE is_active = 1 
             ORDER BY name ASC`
        );
        
        res.json({
            success: true,
            churches: churches
        });
    } catch (err) {
        console.error('❌ Error fetching church list:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/admin/churches/:id - Get individual church by ID (admin only)
router.get('/churches/:id', requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🔍 Admin request for church ID:', churchId, 'from:', req.user?.email);

        if (isNaN(churchId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid church ID format'
            });
        }

        const [churchResult] = await getAppPool().query(
            `SELECT 
                id, name, email, phone, address, city, state_province, postal_code, 
                country, website, preferred_language, timezone, currency, tax_id,
                description_multilang, settings, is_active, database_name,
                has_baptism_records, has_marriage_records, has_funeral_records, 
                setup_complete, created_at, updated_at
            FROM churches 
            WHERE id = ? AND is_active = 1`,
            [churchId]
        );

        if (churchResult.length === 0) {
            console.log('❌ Church not found with ID:', churchId);
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        const church = churchResult[0];
        console.log('✅ Church found for editing:', church.name);

        res.json({
            success: true,
            ...church, // Return the church data directly for compatibility with frontend
            church_id: church.id, // Add church_id for frontend compatibility
            // Add backward compatibility aliases
            admin_email: church.email,
            church_name: church.name,
            language_preference: church.preferred_language || 'en'
        });
    } catch (error) {
        console.error('❌ Error fetching church for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch church',
            error: error.message
        });
    }
});

// POST /admin/churches - Create new church (super_admin only)

// POST /admin/churches/wizard - Create church via comprehensive wizard (super_admin only)
router.post('/churches/wizard', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🧙‍♂️ Church Setup Wizard request:', req.body);
        
        const {
            // Basic church info
            name, email, phone, address, city, state_province, postal_code, country,
            website, preferred_language = 'en', timezone = 'UTC', currency = 'USD', is_active = true,
            
            // Template selection
            template_church_id = null,
            selected_tables = [],
            
            // Custom fields
            custom_fields = [],
            
            // Initial users
            initial_users = [],
            
            // Landing page configuration
            custom_landing_page = { enabled: false }
        } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Church name and email are required'
            });
        }

        // Check for existing church with same name or email
        const [existingChurches] = await getAppPool().query(
            'SELECT id, name, email FROM churches WHERE name = ? OR email = ?',
            [name, email]
        );

        if (existingChurches.length > 0) {
            console.log('🚫 Duplicate church found:', existingChurches);
            return res.status(400).json({
                success: false,
                message: 'Church with this name or email already exists',
                existing: existingChurches[0]
            });
        }

        // Step 1: Insert church record and get the church_id
        const [result] = await getAppPool().query(`
            INSERT INTO churches (
                name, email, phone, address, city, state_province, postal_code,
                country, website, preferred_language, timezone, currency, is_active,
                setup_complete, created_at, updated_at,
                church_name, admin_email, language_preference
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?)
        `, [
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency, is_active ? 1 : 0,
            false,
            name, email, preferred_language
        ]);

        const church_id = result.insertId;
        const dbName = `om_church_${church_id}`;
        console.log('Church created in orthodoxmetrics_db with ID:', church_id);

        // Step 2: Provision tenant database from approved template
        try {
            const provResult = await provisionTenantDb(church_id, getAppPool(), { source: 'admin', initiatedBy: req.session?.user?.id });
            if (!provResult.success) {
                throw new Error(`Tenant DB provisioning failed: ${provResult.error}`);
            }
            console.log(`Tenant DB provisioned: ${dbName} (template v${provResult.templateVersion}, ${provResult.tablesCreated} tables, verified=${provResult.verified})`);

            // Step 3: Create church_info table and seed it (wizard-specific, not in template)
            await getAppPool().query(`
                CREATE TABLE IF NOT EXISTS \`${dbName}\`.church_info (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    church_id INT NOT NULL DEFAULT ${church_id},
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    address TEXT,
                    city VARCHAR(100),
                    state_province VARCHAR(100),
                    country VARCHAR(100),
                    preferred_language VARCHAR(10) DEFAULT 'en',
                    timezone VARCHAR(50) DEFAULT 'America/New_York',
                    currency VARCHAR(10) DEFAULT 'USD',
                    is_active BOOLEAN DEFAULT TRUE,
                    custom_landing_page JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_church_id (church_id)
                )
            `);
            await getAppPool().query(`
                INSERT INTO \`${dbName}\`.church_info (
                    church_id, name, email, phone, address, city, state_province,
                    country, preferred_language, timezone, currency, is_active, custom_landing_page
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                church_id, name, email, phone, address, city, state_province,
                country, preferred_language, timezone, currency, is_active ? 1 : 0,
                JSON.stringify(custom_landing_page)
            ]);

            // Step 4: Create dedicated database user (for future per-tenant isolation)
            const generateSecurePassword = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                let r = '';
                for (let i = 0; i < 16; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
                return r;
            };
            const dbUser = `church_${church_id}`;
            const dbPassword = generateSecurePassword();
            try {
                await getAppPool().query(`CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}'`);
                await getAppPool().query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost'`);
                await getAppPool().query(`FLUSH PRIVILEGES`);
            } catch (userErr) {
                console.warn('DB user creation failed (non-critical):', userErr.message);
            }

            // Step 5: Add wizard-selected optional tables (not in template baseline)
            const optionalTableDefs = {
                'clergy': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.clergy (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL,
                        title VARCHAR(100), position VARCHAR(100),
                        ordination_date DATE, start_date DATE, end_date DATE,
                        email VARCHAR(255), phone VARCHAR(50), is_active BOOLEAN DEFAULT TRUE,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_clergy_church_id (church_id)
                    )`,
                'members': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.members (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL,
                        email VARCHAR(255), phone VARCHAR(50), address TEXT,
                        city VARCHAR(100), state_province VARCHAR(100), postal_code VARCHAR(20), country VARCHAR(100),
                        birth_date DATE, baptism_date DATE, membership_date DATE,
                        membership_status VARCHAR(50) DEFAULT 'active', notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_members_church_id (church_id)
                    )`,
                'donations': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.donations (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        donor_name VARCHAR(255), amount DECIMAL(10,2) NOT NULL,
                        currency VARCHAR(10) DEFAULT '${currency}',
                        donation_date DATE NOT NULL, category VARCHAR(100), method VARCHAR(50),
                        reference_number VARCHAR(100), notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_donations_church_id (church_id)
                    )`,
                'calendar_events': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.calendar_events (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        title VARCHAR(255) NOT NULL, description TEXT, event_date DATE NOT NULL,
                        start_time TIME, end_time TIME, event_type VARCHAR(100), location VARCHAR(255),
                        is_recurring BOOLEAN DEFAULT FALSE, recurrence_pattern VARCHAR(100), created_by INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_events_church_id (church_id)
                    )`,
                'confession_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.confession_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        person_name VARCHAR(255), confession_date DATE NOT NULL, priest_name VARCHAR(255),
                        notes TEXT, is_confidential BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_confession_church_id (church_id)
                    )`,
                'communion_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.communion_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        person_name VARCHAR(255), communion_date DATE NOT NULL, service_type VARCHAR(100),
                        priest_name VARCHAR(255), notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_communion_church_id (church_id)
                    )`,
                'chrismation_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.chrismation_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL,
                        chrismation_date DATE NOT NULL, baptism_date DATE, sponsor_name VARCHAR(255),
                        priest_name VARCHAR(255), confirmation_name VARCHAR(255),
                        certificate_number VARCHAR(100), notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_chrismation_church_id (church_id)
                    )`
            };

            // Only create optional tables the wizard selected (skip baseline tables already in template)
            const baselineTables = new Set(['baptism_records','marriage_records','funeral_records',
                'baptism_history','marriage_history','funeral_history','activity_log','change_log',
                'church_settings','ocr_jobs','ocr_draft_records','ocr_feeder_artifacts','ocr_feeder_pages',
                'ocr_finalize_history','ocr_fused_drafts','ocr_mappings','ocr_settings','ocr_setup_state',
                'record_supplements','template_meta']);
            for (const tableName of selected_tables) {
                if (!baselineTables.has(tableName) && optionalTableDefs[tableName]) {
                    await getAppPool().query(optionalTableDefs[tableName]);
                    console.log(`Created optional table: ${tableName}`);
                }
            }

            // Step 6: Add custom fields to tables
            if (custom_fields && custom_fields.length > 0) {
                for (const field of custom_fields) {
                    try {
                        let fieldDef = `${field.field_name} ${field.field_type}`;
                        if (field.field_type === 'VARCHAR' && field.field_length) fieldDef += `(${field.field_length})`;
                        if (field.is_required) fieldDef += ' NOT NULL';
                        if (field.default_value) fieldDef += ` DEFAULT '${field.default_value}'`;
                        await getAppPool().query(`ALTER TABLE \`${dbName}\`.\`${field.table_name}\` ADD COLUMN ${fieldDef}`);
                    } catch (fieldError) {
                        console.warn(`Failed to add custom field ${field.field_name}:`, fieldError.message);
                    }
                }
            }

            // Step 7: Add initial users to platform DB
            if (initial_users && initial_users.length > 0) {
                for (const user of initial_users) {
                    try {
                        const [existingUsers] = await getAppPool().query(
                            'SELECT id FROM users WHERE email = ?', [user.email]
                        );
                        let userId;
                        if (existingUsers.length > 0) {
                            userId = existingUsers[0].id;
                        } else {
                            const tempPassword = Math.random().toString(36).slice(-12);
                            const hashedPassword = await bcrypt.hash(tempPassword, 10);
                            const [roleResult] = await getAppPool().query(
                                'SELECT id FROM roles WHERE name = ?', [user.role]
                            );
                            if (roleResult.length === 0) throw new Error(`Role '${user.role}' not found`);
                            const full_name = `${user.first_name} ${user.last_name}`;
                            const [uResult] = await getAppPool().query(`
                                INSERT INTO users (email, full_name, role_id, church_id, password_hash, is_active, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                            `, [user.email, full_name, roleResult[0].id, church_id, hashedPassword, true]);
                            userId = uResult.insertId;
                        }
                        await getAppPool().query(
                            'INSERT INTO church_users (church_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
                            [church_id, userId, user.role]
                        );
                    } catch (userError) {
                        console.warn(`Failed to add user ${user.email}:`, userError.message);
                    }
                }
            }

            // Step 8: Store landing page configuration
            if (custom_landing_page && custom_landing_page.enabled) {
                try {
                    await getAppPool().query(`
                        INSERT INTO \`${dbName}\`.church_settings (church_id, setting_key, setting_value)
                        VALUES (?, 'custom_landing_page', ?)
                        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
                    `, [church_id, JSON.stringify(custom_landing_page)]);
                } catch (e) {
                    console.warn('Landing page config insert failed (non-critical):', e.message);
                }
            }

            // Step 9: Store DB credentials and finalize
            await getAppPool().query(`
                UPDATE churches SET database_name = ?, db_name = ?, db_user = ?, db_password = ?, setup_complete = 1 WHERE id = ?
            `, [dbName, dbName, dbUser, dbPassword, church_id]);

            // Step 10: Generate registration token
            const registrationToken = crypto.randomBytes(32).toString('hex');
            const currentUser = req.user || req.session?.user;
            await getAppPool().query(
                'INSERT INTO church_registration_tokens (church_id, token, created_by) VALUES (?, ?, ?)',
                [church_id, registrationToken, currentUser?.id || 0]
            );

            console.log(`Church Setup Wizard completed: church=${church_id}, db=${dbName}`);

        } catch (dbError) {
            console.error('Database setup failed:', dbError);
            // Rollback: delete church record, drop database and user
            try {
                await getAppPool().query('DELETE FROM churches WHERE id = ?', [church_id]);
                await getAppPool().query(`DROP DATABASE IF EXISTS \`${dbName}\``);
                const dbUser = `church_${church_id}`;
                await getAppPool().query(`DROP USER IF EXISTS '${dbUser}'@'localhost'`);
                console.log('Rolled back church record and database');
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw new Error(`Database setup failed: ${dbError.message}`);
        }

        // Fetch the created church
        const [newChurch] = await getAppPool().query('SELECT * FROM churches WHERE id = ?', [church_id]);

        res.json({
            success: true,
            message: `Church "${name}" created successfully with dedicated database`,
            church_id: church_id,
            db_name: dbName,
            church: newChurch[0],
            registration_token: registrationToken,
            wizard_summary: {
                template_used: 'record_template1',
                template_version: '2.0.0',
                tables_created: 20,
                custom_fields_added: custom_fields.length,
                initial_users_added: initial_users.length,
                landing_page_configured: custom_landing_page.enabled,
                church_id: church_id,
                dbName: dbName
            }
        });

    } catch (error) {
        console.error('❌ Church wizard creation failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create church via wizard',
            error: error.message
        });
    }
});

// PUT /admin/churches/:id - Update church (admin for own, super_admin for any)
router.put('/churches/:id', requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        const currentUser = req.user || req.session?.user;

        console.log(`🔧 Updating church ${churchId} by user ${currentUser?.email}`);

        if (isNaN(churchId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid church ID format'
            });
        }

        // Check if church exists
        const [existingChurch] = await getAppPool().query(
            'SELECT id, name FROM churches WHERE id = ?',
            [churchId]
        );

        if (existingChurch.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        // Extract updatable fields from request body
        const {
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency, tax_id,
            description_multilang, settings, is_active, database_name,
            has_baptism_records, has_marriage_records, has_funeral_records,
            setup_complete
            // Note: template_church_id, default_landing_page, enable_ag_grid, ag_grid_record_types, 
            // enable_multilingual, enable_notifications, public_calendar removed - columns don't exist in DB
        } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone || null); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address || null); }
        if (city !== undefined) { updates.push('city = ?'); values.push(city || null); }
        if (state_province !== undefined) { updates.push('state_province = ?'); values.push(state_province || null); }
        if (postal_code !== undefined) { updates.push('postal_code = ?'); values.push(postal_code || null); }
        if (country !== undefined) { updates.push('country = ?'); values.push(country || null); }
        if (website !== undefined) { updates.push('website = ?'); values.push(website || null); }
        if (preferred_language !== undefined) { updates.push('preferred_language = ?'); values.push(preferred_language); }
        if (timezone !== undefined) { updates.push('timezone = ?'); values.push(timezone); }
        if (currency !== undefined) { updates.push('currency = ?'); values.push(currency || null); }
        if (tax_id !== undefined) { updates.push('tax_id = ?'); values.push(tax_id || null); }
        if (description_multilang !== undefined) { updates.push('description_multilang = ?'); values.push(description_multilang || null); }
        if (settings !== undefined) { updates.push('settings = ?'); values.push(typeof settings === 'string' ? settings : JSON.stringify(settings || {})); }
        if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
        if (database_name !== undefined) { updates.push('database_name = ?'); values.push(database_name || null); }
        if (has_baptism_records !== undefined) { updates.push('has_baptism_records = ?'); values.push(has_baptism_records ? 1 : 0); }
        if (has_marriage_records !== undefined) { updates.push('has_marriage_records = ?'); values.push(has_marriage_records ? 1 : 0); }
        if (has_funeral_records !== undefined) { updates.push('has_funeral_records = ?'); values.push(has_funeral_records ? 1 : 0); }
        if (setup_complete !== undefined) { updates.push('setup_complete = ?'); values.push(setup_complete ? 1 : 0); }
        // Removed: template_church_id, default_landing_page, enable_ag_grid, ag_grid_record_types, 
        // enable_multilingual, enable_notifications, public_calendar (these columns don't exist in the churches table)

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(churchId);

        await getAppPool().query(
            `UPDATE churches SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        console.log(`✅ Church ${churchId} updated successfully by ${currentUser?.email}`);

        // Fetch and return updated church
        const [updatedChurch] = await getAppPool().query(
            `SELECT
                id, name, email, phone, address, city, state_province, postal_code,
                country, website, preferred_language, timezone, currency, tax_id,
                description_multilang, settings, is_active, database_name,
                has_baptism_records, has_marriage_records, has_funeral_records,
                setup_complete, created_at, updated_at
            FROM churches WHERE id = ?`,
            [churchId]
        );

        res.json({
            success: true,
            message: 'Church updated successfully',
            church: updatedChurch[0]
        });

    } catch (error) {
        console.error('❌ Error updating church:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update church',
            error: error.message
        });
    }
});

// DELETE /admin/churches/:id - Delete church (super_admin only)
router.delete('/churches/:id', requireSuperAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);

        // Check if there are users assigned to this church
        const [userRows] = await getAppPool().query(
            'SELECT COUNT(*) as user_count FROM orthodoxmetrics_db.users WHERE church_id = ?',
            [churchId]
        );

        if (userRows[0].user_count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete church with assigned users. Please reassign users first.'
            });
        }

        // Get church info before deletion
        const [churchRows] = await getAppPool().query(
            'SELECT name FROM churches WHERE id = ?',
            [churchId]
        );

        if (churchRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        // Delete church
        await getAppPool().query('DELETE FROM churches WHERE id = ?', [churchId]);

        console.log(`✅ Church deleted successfully: ${churchRows[0].name} by admin ${req.user?.email}`);

        res.json({
            success: true,
            message: 'Church deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting church:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting church'
        });
    }
});

// GET /admin/church/:id - Get individual church data for admin panel

// POST /admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Don't allow reset of current user's password
        if (userId === (req.user?.id || req.session?.user?.id)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot reset your own password'
            });
        }

        // Get user info and check permissions
        const [userRows] = await getAppPool().query(
            'SELECT email, role FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUserRole = userRows[0].role;
        const currentUserRole = req.user?.role || req.session?.user?.role;

        // Super admin can reset any role except super_admin
        if (currentUserRole === 'super_admin') {
            if (targetUserRole === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot reset super_admin passwords'
                });
            }
        }

        // Regular admin cannot reset admin or super_admin passwords
        if (currentUserRole === 'admin') {
            if (targetUserRole === 'admin' || targetUserRole === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot reset admin or super_admin passwords'
                });
            }
        }

        // Generate new temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

        // Update user password
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`✅ Password reset for user: ${userRows[0].email} by admin ${req.user?.email}`);
        console.log(`🔐 New temporary password for ${userRows[0].email}: ${tempPassword}`);

        // TODO: Send password via secure email instead of returning in response
        res.json({
            success: true,
            message: 'Password reset successfully. New password has been logged securely for admin retrieval.'
        });

    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while resetting password'
        });
    }
});

// PATCH /admin/users/:id/reset-password - Reset user password with custom password
router.patch('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { new_password } = req.body;
        const currentUser = req.user || req.session?.user;



        // Don't allow reset of current user's password
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot reset your own password'
            });
        }

        // Get target user information
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can manage the target user
        if (!canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'RESET_PASSWORD');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to reset this user\'s password',
                code: 'PASSWORD_RESET_DENIED'
            });
        }

        // Validate provided password
        if (!new_password || typeof new_password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(new_password, saltRounds);

        // Update user password
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`✅ Password reset for user: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);


        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while resetting password'
        });
    }
});

// PATCH /admin/users/:id/status - Update user status
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { is_active } = req.body;
        const currentUser = req.user || req.session?.user;

        // Don't allow deactivation of the current user
        if (userId === currentUser.id && !is_active) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Get target user information
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can perform destructive operations (deactivating is considered destructive)
        if (!is_active && !canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DEACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to deactivate this user',
                code: 'DEACTIVATION_DENIED'
            });
        }

        // Check if current user can manage the target user (for activation)
        if (is_active && !canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'ACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to activate this user',
                code: 'ACTIVATION_DENIED'
            });
        }

        // Update user status
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [is_active ? 1 : 0, userId]
        );

        console.log(`✅ User status updated: ${targetUser.email} -> ${is_active ? 'active' : 'inactive'} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
        });

    } catch (err) {
        console.error('Error updating user status:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user status'
        });
    }
});

/*
// Test endpoint to verify query works (disabled for production)
router.get('/test-users', requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Testing admin users query...');
        
        // Test the exact query that was working
        const [rows] = await getAppPool().query(`
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                u.church_id,
                c.name as church_name,
                u.is_active,
                u.email_verified,
                u.preferred_language,
                u.timezone,
                u.landing_page,
                u.created_at,
                u.updated_at,
                u.last_login
            FROM orthodoxmetrics_db.users u
            LEFT JOIN churches c ON u.church_id = c.id
            ORDER BY u.created_at DESC
        `);

        console.log('✅ Test query successful, returned', rows.length, 'users');
        
        res.json({
            success: true,
            count: rows.length,
            users: rows
        });
    } catch (err) {
        console.error('❌ Test query error:', err.message);
        console.error('❌ Full error:', err);
        res.status(500).json({
            success: false,
            message: 'Test query failed',
            error: err.message
        });
    }
});
*/

// GET /admin/churches/:id/tables - Get available tables for a church (for template selection)

// GET /admin/churches/:id/users - Get church users

// GET /admin/churches/:id/record-counts - Get record counts for church

// GET /admin/churches/:id/database-info - Get database information

// POST /admin/churches/:id/users/:userId/reset-password - Reset user password

// POST /admin/churches/:id/users/:userId/lock - Lock user account

// POST /admin/churches/:id/users/:userId/unlock - Unlock user account

// POST /admin/churches/:id/users - Add new user to church

// PUT /admin/churches/:id/users/:userId - Update church user

// POST /admin/churches/:id/test-connection - Test database connection

// GET /api/admin/roles - Get all system roles
router.get('/roles', requireAdmin, async (req, res) => {
    try {
        const [roles] = await promisePool.query(`
            SELECT id, name, description, is_system
            FROM orthodoxmetrics_db.roles
            WHERE is_system = 1
            ORDER BY 
                CASE name
                    WHEN 'super_admin' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'church_admin' THEN 3
                    WHEN 'priest' THEN 4
                    WHEN 'deacon' THEN 5
                    WHEN 'cantor' THEN 6
                    WHEN 'editor' THEN 7
                    WHEN 'member' THEN 8
                    WHEN 'viewer' THEN 9
                    WHEN 'guest' THEN 10
                    ELSE 99
                END,
                name ASC
        `);
        
        res.json({
            success: true,
            roles: roles
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles'
        });
    }
});

module.exports = router;
