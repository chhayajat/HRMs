const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  punches: [{
    type: { type: String, enum: ['In', 'Out'], required: true },
    time: { type: Date, required: true },
    ipAddress: { type: String },
    location: { type: String }
  }],
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Half-Day', 'Absent', 'On Leave', 'Holiday', 'Weekly Off'],
    default: 'Absent'
  },
  regularization: {
    requested: { type: Boolean, default: false },
    reason: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    originalStatus: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: { type: String },
    requestedPunches: [{
      type: { type: String, enum: ['In', 'Out'] },
      time: { type: Date }
    }]
  }
});

AttendanceSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });

const MongooseModel = mongoose.model('Attendance', AttendanceSchema);
const getMock = () => require('../config/jsonDb').getMockModel('attendances');

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
