/**
 * @fileoverview Scans Upload router.
 * @module routes/upload
 */

const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const { uploadToCloudinary, generateUploadPath } = require('../utils/cloudinary');
const { supabaseAdmin } = require('../utils/supabase');

const router = express.Router();

// Multer memory storage configuration (saves file as Buffer in req.file.buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

/**
 * POST /api/upload
 * Secure endpoint to upload scanned documents.
 * Middleware: verifyToken (requires valid Supabase JWT)
 */
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request: No scan image file provided.' });
    }

    const userId = req.user.id;
    const { folder, filename } = generateUploadPath(userId);

    // 1. Upload the image buffer directly to Cloudinary
    console.log(`Uploading file for user ${userId} to folder ${folder} as ${filename}...`);
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, folder, filename);

    // Extract Date for the date_folder (YYYY-MM-DD format from folder path 'scans/YYYY-MM-DD')
    const dateFolder = folder.replace('scans/', '');

    // 2. Save file metadata in Supabase scans table (using supabaseAdmin to bypass RLS for server write)
    const { data: scanRecord, error: dbError } = await supabaseAdmin
      .from('scans')
      .insert({
        user_id: userId,
        cloudinary_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        date_folder: dateFolder
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database write error:', dbError);
      return res.status(500).json({ error: 'Failed to record scan metadata in database.', details: dbError.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Scan uploaded and recorded successfully.',
      scan: scanRecord
    });
  } catch (err) {
    console.error('Error in POST /api/upload route:', err);
    return res.status(500).json({ error: 'Internal server error processing scan upload.', details: err.message });
  }
});

module.exports = router;
