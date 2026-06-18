const multer = require('multer');

// Use memory storage so we can pipe buffers directly to Cloudinary
const storage = multer.memoryStorage();

// File filter — allow images and common document types
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  const allAllowed = [...allowedImageTypes, ...allowedDocTypes];

  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Allowed: images (JPEG, PNG, GIF, WebP, SVG), documents (PDF, DOC, DOCX, XLS, XLSX, TXT)`), false);
  }
};

// Single photo upload (for employee profile picture)
const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit for photos
  }
}).single('photo');

// Single document upload
const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit for documents
  }
}).single('document');

// Multiple documents upload (up to 5 at a time)
const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB per file
  }
}).array('documents', 5);

// Middleware wrapper to handle multer errors gracefully
const handleUpload = (uploadFn) => {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File is too large. Maximum size is 10MB for documents and 5MB for photos.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded. Maximum 5 files at a time.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadPhoto: handleUpload(uploadPhoto),
  uploadDocument: handleUpload(uploadDocument),
  uploadDocuments: handleUpload(uploadDocuments)
};
