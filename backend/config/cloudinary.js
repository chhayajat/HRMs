const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder path
 * @param {string} options.resourceType - 'image', 'raw', or 'auto'
 * @param {string} options.publicId - Optional custom public ID
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      folder = 'gravity-hrms',
      resourceType = 'auto',
      publicId,
      transformation
    } = options;

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false
    };

    if (publicId) uploadOptions.public_id = publicId;
    if (transformation) uploadOptions.transformation = transformation;

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @param {string} resourceType - 'image', 'raw', or 'video'
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Extract public ID from a Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} The public ID
 */
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    // Remove version number and file extension
    const pathAfterUpload = parts[1];
    const withoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getPublicIdFromUrl
};
