const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['Employee', 'Manager', 'HR', 'Leadership'],
    default: 'Employee'
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  employeeProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const MongooseModel = mongoose.model('User', UserSchema);
const getMock = () => require('../config/jsonDb').getMockModel('users');

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
