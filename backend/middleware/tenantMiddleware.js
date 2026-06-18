const Tenant = require('../models/Tenant');

const resolveTenant = async (req, res, next) => {
  // If req.tenantId is already set by authMiddleware, proceed
  if (req.tenantId) {
    return next();
  }

  // Otherwise, inspect the header
  const tenantIdHeader = req.headers['tenant-id'] || req.headers['x-tenant-id'];
  
  if (!tenantIdHeader) {
    // If it's a route that doesn't strictly need auth (e.g. register tenant), it might not have header.
    // However, if we need it for scoped actions, we error out.
    return next();
  }

  try {
    const tenant = await Tenant.findById(tenantIdHeader);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Invalid Tenant ID provided' });
    }
    req.tenantId = tenant._id;
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Bad Tenant ID format' });
  }
};

module.exports = { resolveTenant };
