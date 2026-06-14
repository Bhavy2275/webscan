/**
 * @fileoverview Authentication and Authorization Express middlewares.
 * @module middleware/auth
 */

const { supabase, supabaseAdmin } = require('../utils/supabase');

/**
 * Middleware to verify Supabase JWT token.
 * Validates the Authorization header Bearer token.
 * 
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @param {import('express').NextFunction} next - Next middleware
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header format.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing bearer token.' });
    }

    // Verify token using official Supabase getUser API
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or session expired.', details: error?.message });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error in verifyToken middleware:', err);
    return res.status(500).json({ error: 'Internal server error validating auth token.' });
  }
}

/**
 * Middleware to restrict access to Admin-only routes.
 * Checks the database profiles table to verify administrative privileges.
 * 
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @param {import('express').NextFunction} next - Next middleware
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User is not authenticated.' });
    }

    // Fetch user profile metadata from Supabase
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Forbidden: Profile not found or database fetch failed.' });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Administrative privileges required.' });
    }

    next();
  } catch (err) {
    console.error('Error in requireAdmin middleware:', err);
    return res.status(500).json({ error: 'Internal server error validating user permissions.' });
  }
}

module.exports = {
  verifyToken,
  requireAdmin
};
