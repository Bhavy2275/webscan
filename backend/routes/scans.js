/**
 * @fileoverview Scans Management router.
 * @module routes/scans
 */

const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { deleteFromCloudinary, getSignedUrl } = require('../utils/cloudinary');
const { supabaseAdmin } = require('../utils/supabase');

const router = express.Router();

/**
 * GET /api/scans/:id/signed-url
 * Returns a time-limited signed URL for viewing a scan.
 * Middleware: verifyToken, requireAdmin (Admin only)
 */
router.get('/:id/signed-url', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch public_id from database
    const { data: scan, error: dbError } = await supabaseAdmin
      .from('scans')
      .select('public_id')
      .eq('id', id)
      .single();

    if (dbError || !scan) {
      return res.status(404).json({ error: 'Scan record not found.' });
    }

    // Generate signed URL (expires in 1 hour)
    const signedUrl = getSignedUrl(scan.public_id, 3600);

    return res.json({
      success: true,
      signedUrl
    });
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return res.status(500).json({ error: 'Internal server error generating signed URL.' });
  }
});

/**
 * DELETE /api/scans/:id
 * Removes scan record from Supabase database and deletes file from Cloudinary.
 * Middleware: verifyToken, requireAdmin (Admin only)
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch scan metadata to obtain the Cloudinary public_id
    const { data: scan, error: fetchError } = await supabaseAdmin
      .from('scans')
      .select('public_id')
      .eq('id', id)
      .single();

    if (fetchError || !scan) {
      console.warn(`Scan not found for deletion: ${id}`);
      return res.status(404).json({ error: 'Scan record not found.' });
    }

    // 2. Destroy asset in Cloudinary
    console.log(`Deleting asset ${scan.public_id} from Cloudinary...`);
    const cloudinaryResult = await deleteFromCloudinary(scan.public_id);
    console.log('Cloudinary deletion result:', cloudinaryResult);

    // 3. Delete record from Supabase scans table
    const { error: deleteError } = await supabaseAdmin
      .from('scans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete scan record from database.', details: deleteError.message });
    }

    return res.json({
      success: true,
      message: 'Scan deleted successfully from storage and database.'
    });
  } catch (err) {
    console.error('Error in DELETE /api/scans/:id route:', err);
    return res.status(500).json({ error: 'Internal server error deleting scan.', details: err.message });
  }
});

module.exports = router;
