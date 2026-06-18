const { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } = require('../config/cloudinary');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

// @desc    Upload employee profile photo
// @route   POST /api/upload/photo/:employeeId
// @access  Private (HR or Self)
const uploadEmployeePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a photo file' });
    }

    const employee = await Employee.findOne({ _id: req.params.employeeId, tenantId: req.tenantId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Authorization: HR or the employee themselves
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employee._id.toString();
    const isHr = req.user.role === 'HR';
    if (!isSelf && !isHr) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload photo for this employee' });
    }

    // Delete old photo from Cloudinary if exists
    if (employee.personal.photo) {
      const oldPublicId = getPublicIdFromUrl(employee.personal.photo);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId, 'image');
        } catch (err) {
          console.warn('Could not delete old photo from Cloudinary:', err.message);
        }
      }
    }

    // Upload new photo to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `gravity-hrms/${req.tenantId}/photos`,
      resourceType: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // Update employee's photo URL
    await Employee.findByIdAndUpdate(
      employee._id,
      { $set: { 'personal.photo': result.secure_url } },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'EMPLOYEE_PHOTO_UPLOADED',
      details: `Profile photo uploaded for ${employee.personal.name} (${employee.employeeId})`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo', error: error.message });
  }
};

// @desc    Upload employee document (Aadhaar, PAN, offer letter, etc.)
// @route   POST /api/upload/document/:employeeId
// @access  Private (HR or Self)
const uploadEmployeeDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a document file' });
    }

    const employee = await Employee.findOne({ _id: req.params.employeeId, tenantId: req.tenantId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Authorization
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employee._id.toString();
    const isHr = req.user.role === 'HR';
    if (!isSelf && !isHr) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload documents for this employee' });
    }

    const documentName = req.body.name || req.file.originalname;

    // Upload document to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `gravity-hrms/${req.tenantId}/documents/${employee.employeeId}`,
      resourceType: 'auto'
    });

    // Add document to employee's documents array
    const documentEntry = {
      name: documentName,
      fileUrl: result.secure_url,
      uploadedAt: new Date()
    };

    await Employee.findByIdAndUpdate(
      employee._id,
      { $push: { documents: documentEntry } },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'EMPLOYEE_DOCUMENT_UPLOADED',
      details: `Document "${documentName}" uploaded for ${employee.personal.name} (${employee.employeeId})`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        name: documentName,
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document', error: error.message });
  }
};

// @desc    Upload multiple employee documents at once
// @route   POST /api/upload/documents/:employeeId
// @access  Private (HR or Self)
const uploadMultipleDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one document' });
    }

    const employee = await Employee.findOne({ _id: req.params.employeeId, tenantId: req.tenantId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Authorization
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employee._id.toString();
    const isHr = req.user.role === 'HR';
    if (!isSelf && !isHr) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload documents for this employee' });
    }

    const uploadedDocs = [];

    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, {
        folder: `gravity-hrms/${req.tenantId}/documents/${employee.employeeId}`,
        resourceType: 'auto'
      });

      const docEntry = {
        name: file.originalname,
        fileUrl: result.secure_url,
        uploadedAt: new Date()
      };

      uploadedDocs.push(docEntry);
    }

    // Push all documents at once
    await Employee.findByIdAndUpdate(
      employee._id,
      { $push: { documents: { $each: uploadedDocs } } },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'EMPLOYEE_DOCUMENTS_BULK_UPLOADED',
      details: `${uploadedDocs.length} documents uploaded for ${employee.personal.name} (${employee.employeeId})`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `${uploadedDocs.length} documents uploaded successfully`,
      data: uploadedDocs
    });
  } catch (error) {
    console.error('Bulk document upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload documents', error: error.message });
  }
};

// @desc    Delete an employee document
// @route   DELETE /api/upload/document/:employeeId/:documentId
// @access  Private (HR or Self)
const deleteEmployeeDocument = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.employeeId, tenantId: req.tenantId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Authorization
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employee._id.toString();
    const isHr = req.user.role === 'HR';
    if (!isSelf && !isHr) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete documents for this employee' });
    }

    const doc = employee.documents.id(req.params.documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete from Cloudinary
    const publicId = getPublicIdFromUrl(doc.fileUrl);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId, 'raw');
      } catch (err) {
        console.warn('Could not delete document from Cloudinary:', err.message);
      }
    }

    // Remove from employee documents array
    await Employee.findByIdAndUpdate(
      employee._id,
      { $pull: { documents: { _id: req.params.documentId } } },
      { new: true }
    );

    // Audit log
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'EMPLOYEE_DOCUMENT_DELETED',
      details: `Document "${doc.name}" deleted for ${employee.personal.name} (${employee.employeeId})`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
  }
};

module.exports = {
  uploadEmployeePhoto,
  uploadEmployeeDocument,
  uploadMultipleDocuments,
  deleteEmployeeDocument
};
