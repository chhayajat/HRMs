const mongoose = require('mongoose');

const LeaveBalanceSchema = new mongoose.Schema({
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
  year: {
    type: Number,
    required: true
  },
  balances: [{
    leaveType: { type: String, enum: ['Casual', 'Sick', 'Earned', 'Loss of Pay'], required: true },
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  }]
});

LeaveBalanceSchema.index({ tenantId: 1, employeeId: 1, year: 1 }, { unique: true });

const MongooseModel = mongoose.model('LeaveBalance', LeaveBalanceSchema);
const getMock = () => require('../config/jsonDb').getMockModel('leavebalances');

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
