const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../data/db.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Initial DB structure
const initialDb = {
  tenants: [],
  users: [],
  employees: [],
  attendances: [],
  leaverequests: [],
  leavebalances: [],
  auditlogs: [],
  notifications: [],
  profileeditrequests: []
};

// Load data from file or initialize
const loadDb = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to load JSON DB, initializing empty:', err.message);
  }
  return { ...initialDb };
};

const dbData = loadDb();

const saveDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write JSON DB file:', err.message);
  }
};

// Helper: generate random ObjectID string
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper to filter items based on simple query object
const filterItems = (items, query) => {
  if (!query) return items;
  
  return items.filter(item => {
    for (const key in query) {
      const val = query[key];
      
      // Handle MongoDB operators
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('$in' in val) {
          const arr = val['$in'].map(x => x?.toString() || x);
          if (!arr.includes(item[key]?.toString())) return false;
          continue;
        }
        if ('$gte' in val) {
          if (item[key] < val['$gte']) return false;
          continue;
        }
        if ('$lte' in val) {
          if (item[key] > val['$lte']) return false;
          continue;
        }
        if ('$or' in val) {
          // Special OR handling for current queries
          // e.g. { $or: [ { managerId }, { _id } ] }
          continue;
        }
      }

      // Handle simple comparisons
      if (item[key]?.toString() !== val?.toString()) {
        return false;
      }
    }
    return true;
  });
};

// Mock Query class to support populate, sort, limit, then
class MockQuery {
  constructor(data, collectionName) {
    this.data = data;
    this.collectionName = collectionName;
  }

  populate(pathStr) {
    // If populating, map related documents
    if (!this.data) return this;
    
    const populateSingle = (item) => {
      if (!item) return item;
      
      // Populate employment.managerId
      if (pathStr.includes('managerId') && item.employment && item.employment.managerId) {
        const mgrId = item.employment.managerId.toString();
        const mgr = dbData.employees.find(e => e._id === mgrId);
        if (mgr) {
          item.employment.managerId = { ...mgr };
        }
      }
      
      // Populate employeeProfileId
      if (pathStr.includes('employeeProfileId') && item.employeeProfileId) {
        const empId = item.employeeProfileId.toString();
        const emp = dbData.employees.find(e => e._id === empId);
        if (emp) {
          item.employeeProfileId = { ...emp };
        }
      }

      // Populate employeeId reference
      if (pathStr.includes('employeeId') && item.employeeId) {
        const empId = item.employeeId.toString();
        const emp = dbData.employees.find(e => e._id === empId);
        if (emp) {
          item.employeeId = { ...emp };
        }
      }

      return item;
    };

    if (Array.isArray(this.data)) {
      this.data = this.data.map(populateSingle);
    } else {
      this.data = populateSingle(this.data);
    }
    return this;
  }

  sort(options) {
    if (!Array.isArray(this.data)) return this;
    // Simple sort by date or name
    if (options && typeof options === 'object') {
      const key = Object.keys(options)[0];
      const direction = options[key];
      this.data.sort((a, b) => {
        if (a[key] < b[key]) return direction === -1 ? 1 : -1;
        if (a[key] > b[key]) return direction === -1 ? -1 : 1;
        return 0;
      });
    } else if (typeof options === 'string') {
      const key = options.startsWith('-') ? options.substring(1) : options;
      const direction = options.startsWith('-') ? -1 : 1;
      this.data.sort((a, b) => {
        if (a[key] < b[key]) return direction === -1 ? 1 : -1;
        if (a[key] > b[key]) return direction === -1 ? -1 : 1;
        return 0;
      });
    }
    return this;
  }

  limit(n) {
    if (Array.isArray(this.data)) {
      this.data = this.data.slice(0, n);
    }
    return this;
  }

  then(onResolve) {
    return Promise.resolve(this.data).then(onResolve);
  }
}

// Factory to create mock model operations
const getMockModel = (collectionName) => {
  const collection = dbData[collectionName];

  return {
    find: (query = {}) => {
      // Handle $or operator manually if present
      let results = [];
      if (query && query['$or']) {
        const orConditions = query['$or'];
        results = collection.filter(item => {
          return orConditions.some(cond => {
            for (const key in cond) {
              if (item[key]?.toString() !== cond[key]?.toString()) return false;
            }
            return true;
          });
        });
        // apply remaining top-level filters
        const restQuery = { ...query };
        delete restQuery['$or'];
        results = filterItems(results, restQuery);
      } else {
        results = filterItems(collection, query);
      }
      
      // return a copy
      const copiedResults = JSON.parse(JSON.stringify(results));
      return new MockQuery(copiedResults, collectionName);
    },

    findOne: (query) => {
      const results = filterItems(collection, query);
      const first = results.length > 0 ? JSON.parse(JSON.stringify(results[0])) : null;
      
      // Inject save and matchPassword methods if it's a User model
      if (first && collectionName === 'users') {
        first.matchPassword = async function (enteredPassword) {
          return await bcrypt.compare(enteredPassword, this.password);
        };
        first.save = async function () {
          const userIdx = collection.findIndex(u => u._id === this._id);
          if (userIdx !== -1) {
            collection[userIdx] = { ...this };
            saveDb();
          }
          return this;
        };
      }

      // Inject save method for other models
      if (first) {
        first.save = async function () {
          const idx = collection.findIndex(x => x._id === this._id);
          if (idx !== -1) {
            collection[idx] = { ...this };
            saveDb();
          }
          return this;
        };
      }

      return new MockQuery(first, collectionName);
    },

    findById: (id) => {
      const item = collection.find(x => x._id === id?.toString());
      const copy = item ? JSON.parse(JSON.stringify(item)) : null;

      if (copy) {
        copy.save = async function () {
          const idx = collection.findIndex(x => x._id === this._id);
          if (idx !== -1) {
            collection[idx] = { ...this };
            saveDb();
          }
          return this;
        };
      }

      return new MockQuery(copy, collectionName);
    },

    create: async (doc) => {
      const newDoc = {
        _id: generateId(),
        ...doc,
        createdAt: new Date().toISOString()
      };

      // Encrypt password if user is created
      if (collectionName === 'users' && newDoc.password) {
        const salt = await bcrypt.genSalt(10);
        newDoc.password = await bcrypt.hash(newDoc.password, salt);
      }

      collection.push(newDoc);
      saveDb();

      // Return copy with save method
      const copy = JSON.parse(JSON.stringify(newDoc));
      copy.save = async function () {
        const idx = collection.findIndex(x => x._id === this._id);
        if (idx !== -1) {
          collection[idx] = { ...this };
          saveDb();
        }
        return this;
      };

      return copy;
    },

    findByIdAndUpdate: async (id, update, options) => {
      const idx = collection.findIndex(x => x._id === id?.toString());
      if (idx === -1) return null;

      const current = collection[idx];
      let updated = { ...current };

      if (update['$set']) {
        updated = { ...updated, ...update['$set'] };
      } else {
        updated = { ...updated, ...update };
      }

      collection[idx] = updated;
      saveDb();
      return JSON.parse(JSON.stringify(updated));
    },

    findOneAndUpdate: async (query, update, options = {}) => {
      const results = filterItems(collection, query);
      if (results.length === 0) {
        if (options.upsert) {
          // Create document
          const doc = update['$set'] ? update['$set'] : update;
          const newDoc = { _id: generateId(), ...query, ...doc };
          collection.push(newDoc);
          saveDb();
          return JSON.parse(JSON.stringify(newDoc));
        }
        return null;
      }

      const item = results[0];
      const idx = collection.findIndex(x => x._id === item._id);
      
      let updated = { ...collection[idx] };
      if (update['$set']) {
        updated = { ...updated, ...update['$set'] };
      } else {
        updated = { ...updated, ...update };
      }

      collection[idx] = updated;
      saveDb();
      return JSON.parse(JSON.stringify(updated));
    },

    findOneAndDelete: async (query) => {
      const results = filterItems(collection, query);
      if (results.length === 0) return null;

      const item = results[0];
      const idx = collection.findIndex(x => x._id === item._id);
      collection.splice(idx, 1);
      saveDb();
      return JSON.parse(JSON.stringify(item));
    },

    updateMany: async (query, update) => {
      const results = filterItems(collection, query);
      results.forEach(item => {
        const idx = collection.findIndex(x => x._id === item._id);
        if (idx !== -1) {
          if (update['$set']) {
            collection[idx] = { ...collection[idx], ...update['$set'] };
          } else {
            collection[idx] = { ...collection[idx], ...update };
          }
        }
      });
      saveDb();
      return { modifiedCount: results.length };
    },

    countDocuments: async (query = {}) => {
      const results = filterItems(collection, query);
      return results.length;
    },

    deleteMany: async () => {
      collection.length = 0;
      saveDb();
      return { deletedCount: 0 };
    },

    // Simple aggregate implementation for department counts
    aggregate: async (pipeline) => {
      // Typically used for: [{ $match: { tenantId, status: 'Active' } }, { $group: { _id: '$employment.department', count: { $sum: 1 } } }]
      const matchStage = pipeline.find(stage => '$match' in stage);
      const groupStage = pipeline.find(stage => '$group' in stage);

      let items = collection;
      if (matchStage) {
        items = filterItems(collection, matchStage['$match']);
      }

      if (groupStage) {
        const groupField = groupStage['$group']._id; // e.g. '$employment.department'
        const cleanField = groupField.startsWith('$') ? groupField.substring(1) : groupField;
        
        const counts = {};
        items.forEach(item => {
          // resolve path like 'employment.department'
          const parts = cleanField.split('.');
          let val = item;
          for (const p of parts) {
            val = val ? val[p] : undefined;
          }
          const key = val || 'Unassigned';
          counts[key] = (counts[key] || 0) + 1;
        });

        return Object.keys(counts).map(k => ({
          _id: k,
          count: counts[k]
        }));
      }

      return items;
    }
  };
};

module.exports = {
  getMockModel,
  dbData,
  saveDb
};
