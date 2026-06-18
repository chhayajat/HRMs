const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a tenant name'],
    trim: true
  },
  domain: {
    type: String,
    unique: true,
    sparse: true
  },
  settings: {
    shifts: {
      type: Array,
      default: [
        { id: 'shift_general', name: 'General Shift', startTime: '09:00', endTime: '18:00', gracePeriod: 15 },
        { id: 'shift_night', name: 'Night Shift', startTime: '22:00', endTime: '06:00', gracePeriod: 15 }
      ]
    },
    leavePolicies: {
      type: Array,
      default: [
        { leaveType: 'Casual', allocation: 12, carryForward: false },
        { leaveType: 'Sick', allocation: 10, carryForward: true },
        { leaveType: 'Earned', allocation: 15, carryForward: true }
      ]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseModel = mongoose.model('Tenant', TenantSchema);
const getMock = () => require('../config/jsonDb').getMockModel('tenants');

module.exports = {
  find: (q) => (process.env.USE_MOCK_DB === 'true' ? getMock().find(q) : MongooseModel.find(q)),
  findOne: (q) => (process.env.USE_MOCK_DB === 'true' ? getMock().findOne(q) : MongooseModel.findOne(q)),
  findById: (id) => (process.env.USE_MOCK_DB === 'true' ? getMock().findById(id) : MongooseModel.findById(id)),
  create: (doc) => (process.env.USE_MOCK_DB === 'true' ? getMock().create(doc) : MongooseModel.create(doc)),
  findByIdAndUpdate: (id, u, o) => (process.env.USE_MOCK_DB === 'true' ? getMock().findByIdAndUpdate(id, u, o) : MongooseModel.findByIdAndUpdate(id, u, o)),
  findOneAndUpdate: (q, u, o) => (process.env.USE_MOCK_DB === 'true' ? getMock().findOneAndUpdate(q, u, o) : MongooseModel.findOneAndUpdate(q, u, o)),
  findOneAndDelete: (q) => (process.env.USE_MOCK_DB === 'true' ? getMock().findOneAndDelete(q) : MongooseModel.findOneAndDelete(q)),
  updateMany: (q, u) => (process.env.USE_MOCK_DB === 'true' ? getMock().updateMany(q, u) : MongooseModel.updateMany(q, u)),
  countDocuments: (q) => (process.env.USE_MOCK_DB === 'true' ? getMock().countDocuments(q) : MongooseModel.countDocuments(q)),
  deleteMany: (q) => (process.env.USE_MOCK_DB === 'true' ? getMock().deleteMany(q) : MongooseModel.deleteMany(q)),
  aggregate: (p) => (process.env.USE_MOCK_DB === 'true' ? getMock().aggregate(p) : MongooseModel.aggregate(p))
};
