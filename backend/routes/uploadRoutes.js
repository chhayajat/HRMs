const express = require('express');
const router = express.Router();
const {
  uploadEmployeePhoto,
  uploadEmployeeDocument,
  uploadMultipleDocuments,
  deleteEmployeeDocument
} = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPhoto, uploadDocument, uploadDocuments } = require('../middleware/uploadMiddleware');

// Upload employee profile photo
router.post('/photo/:employeeId', protect, uploadPhoto, uploadEmployeePhoto);

// Upload single employee document
router.post('/document/:employeeId', protect, uploadDocument, uploadEmployeeDocument);

// Upload multiple employee documents (up to 5)
router.post('/documents/:employeeId', protect, uploadDocuments, uploadMultipleDocuments);

// Delete a specific employee document
router.delete('/document/:employeeId/:documentId', protect, deleteEmployeeDocument);

module.exports = router;
