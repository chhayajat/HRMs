const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  employeeId: {
    type: String,
    required: [true, 'Please add an employee ID']
  },
  status: {
    type: String,
    enum: ['Active', 'Probation', 'Onboarding', 'Terminated', 'Archived'],
    default: 'Onboarding'
  },
  personal: {
    name: { type: String, required: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer Not to Say'] },
    photo: { type: String }, // Base64 or URL
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    nationality: { type: String, default: 'Indian' }
  },
  contact: {
    personalEmail: { type: String, required: true },
    officialEmail: { type: String },
    phone: { type: String, required: true },
    currentAddress: { type: String },
    permanentAddress: { type: String },
    emergencyContact: {
      name: { type: String },
      relation: { type: String },
      phone: { type: String }
    }
  },
  employment: {
    dateOfJoining: { type: Date, default: Date.now },
    employmentType: { type: String, enum: ['Full-Time', 'Part-Time', 'Contractor', 'Intern'], default: 'Full-Time' },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    grade: { type: String },
    location: { type: String },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Reporting manager
    shiftId: { type: String, default: 'shift_general' }
  },
  bank: {
    accountName: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    ifscCode: { type: String },
    panNumber: { type: String },
    aadhaarNumber: { type: String },
    pfNumber: { type: String },
    esiNumber: { type: String },
    uanNumber: { type: String }
  },
  professional: {
    education: [{
      degree: { type: String },
      institution: { type: String },
      passingYear: { type: Number }
    }],
    experience: [{
      company: { type: String },
      designation: { type: String },
      fromYear: { type: Number },
      toYear: { type: Number }
    }],
    skills: [String],
    certifications: [String]
  },
  documents: [{
    name: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

EmployeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

const MongooseModel = mongoose.model('Employee', EmployeeSchema);
const getMock = () => require('../config/jsonDb').getMockModel('employees');

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
