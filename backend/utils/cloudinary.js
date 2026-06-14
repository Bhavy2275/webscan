/**
 * @fileoverview Cloudinary API utility methods.
 * @module utils/cloudinary
 */

const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn('Warning: Missing Cloudinary configuration variables in environment.');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

/**
 * Uploads a file buffer directly to Cloudinary.
 * 
 * @param {Buffer} fileBuffer - The file raw buffer.
 * @param {string} folder - Target Cloudinary folder path.
 * @param {string} filename - Target file name (public_id).
 * @returns {Promise<object>} Cloudinary upload result object.
 */
function uploadToCloudinary(fileBuffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: filename,
        resource_type: 'image',
        overwrite: true
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

/**
 * Deletes a file from Cloudinary using its public ID.
 * 
 * @param {string} publicId - The Cloudinary public_id.
 * @returns {Promise<object>} Cloudinary destroy response.
 */
function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
}

/**
 * Generates a signed, time-limited URL for a Cloudinary asset.
 * Useful for viewing private assets.
 * 
 * @param {string} publicId - Cloudinary public_id.
 * @param {number} [expiresInSeconds=3600] - Expiry offset in seconds (default 1 hour).
 * @returns {string} Signed asset URL.
 */
function getSignedUrl(publicId, expiresInSeconds = 3600) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    sign_url: true,
    secure: true,
    resource_type: 'image',
    expires_at: expiresAt
  });
}

/**
 * Helper to generate file paths matching requirement:
 * scans/{YYYY-MM-DD}/{userId}_{DD-MM-YYYY_HH-mm-ss}
 * 
 * @param {string} userId - User identifier.
 * @returns {{folder: string, filename: string, fullPath: string}} Date-based paths.
 */
function generateUploadPath(userId) {
  const now = new Date();
  
  // Format YYYY-MM-DD
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateFolder = `${yyyy}-${mm}-${dd}`;
  
  // Format DD-MM-YYYY_HH-mm-ss
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const folder = `scans/${dateFolder}`;
  const filename = `${userId}_${dd}-${mm}-${yyyy}_${hours}-${minutes}-${seconds}`;
  
  return {
    folder,
    filename,
    fullPath: `${folder}/${filename}`
  };
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getSignedUrl,
  generateUploadPath
};
