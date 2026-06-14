/**
 * @fileoverview Admin User Management router.
 * @module routes/users
 */

const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

const router = express.Router();

/**
 * GET /api/admin/users
 * Returns list of all user profiles from public.profiles.
 * Middleware: verifyToken, requireAdmin (Admin only)
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('email', { ascending: true });

    if (error) {
      console.error('Error fetching user profiles:', error);
      return res.status(500).json({ error: 'Failed to fetch profiles from database.' });
    }

    return res.json({
      success: true,
      users: profiles
    });
  } catch (err) {
    console.error('Error in GET /api/admin/users:', err);
    return res.status(500).json({ error: 'Internal server error fetching profiles.' });
  }
});

/**
 * POST /api/admin/users
 * Creates a new user in Supabase Auth and automatically creates public.profiles entry.
 * Middleware: verifyToken, requireAdmin (Admin only)
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Bad Request: email, password, and role are required.' });
    }

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Bad Request: role must be either "user" or "admin".' });
    }

    console.log(`Admin creating user: ${email} with role: ${role}...`);

    // Create user using Supabase Admin Auth API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role } // Handled by handle_new_user() DB trigger
    });

    if (authError || !authData.user) {
      console.error('Error in auth.admin.createUser:', authError);
      return res.status(500).json({ error: 'Failed to create user in Auth system.', details: authError?.message });
    }

    // Wait a brief moment or query the profiles table to return the created profile.
    // The DB trigger is synchronous, so the profile should exist immediately.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.warn('Profile table sync delay. Returning auth info only.');
      return res.status(201).json({
        success: true,
        message: 'User created in auth. Profile is syncing.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: profile
    });
  } catch (err) {
    console.error('Error in POST /api/admin/users:', err);
    return res.status(500).json({ error: 'Internal server error creating user.', details: err.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deletes user from Supabase Auth (cascades to profiles and scans).
 * Middleware: verifyToken, requireAdmin (Admin only)
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Bad Request: User ID is required.' });
    }

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Bad Request: Admins cannot delete their own account.' });
    }

    console.log(`Admin deleting user ID: ${id}...`);

    // Delete user from Supabase Auth. Cascading references will handle profiles and scans.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Error deleting user in Auth system:', authError);
      return res.status(500).json({ error: 'Failed to delete user from Auth system.', details: authError.message });
    }

    return res.json({
      success: true,
      message: 'User and all associated profiles/scans deleted successfully.'
    });
  } catch (err) {
    console.error('Error in DELETE /api/admin/users/:id:', err);
    return res.status(500).json({ error: 'Internal server error deleting user.', details: err.message });
  }
});

module.exports = router;
