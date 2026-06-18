import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Edit2, UserPlus, X } from 'lucide-react';

const EmployeeManagementPage = () => {
  const { apiCall } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  
  const [activeTab, setActiveTab] = useState('personal');

  const [formData, setFormData] = useState({
    employeeId: '',
    role: 'Employee',
    personal: { name: '', dob: '', gender: 'Male', photo: '', maritalStatus: 'Single', nationality: 'Indian' },
    contact: { personalEmail: '', officialEmail: '', phone: '', currentAddress: '', permanentAddress: '', emergencyContact: { name: '', relation: '', phone: '' } },
    employment: { dateOfJoining: '', employmentType: 'Full-Time', department: '', designation: '', grade: 'G1', location: 'Mumbai', managerId: '', shiftId: 'shift_general' },
    bank: { accountName: '', accountNumber: '', bankName: '', ifscCode: '', panNumber: '', aadhaarNumber: '', pfNumber: '', esiNumber: '', uanNumber: '' },
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/employees');
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'Employee',
      personal: { name: '', dob: '', gender: 'Male', photo: '', maritalStatus: 'Single', nationality: 'Indian' },
      contact: { personalEmail: '', officialEmail: '', phone: '', currentAddress: '', permanentAddress: '', emergencyContact: { name: '', relation: '', phone: '' } },
      employment: { dateOfJoining: new Date().toISOString().split('T')[0], employmentType: 'Full-Time', department: '', designation: '', grade: 'G1', location: 'Mumbai', managerId: '', shiftId: 'shift_general' },
      bank: { accountName: '', accountNumber: '', bankName: '', ifscCode: '', panNumber: '', aadhaarNumber: '', pfNumber: '', esiNumber: '', uanNumber: '' },
    });
    setModalMode('add');
    setActiveTab('personal');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const handleOpenEdit = async (emp) => {
    try {
      const res = await apiCall(`/employees/${emp._id}`);
      if (res.success) {
        const fullEmp = res.data;
        setFormData({
          employeeId: fullEmp.employeeId,
          role: fullEmp.role || 'Employee',
          personal: {
            name: fullEmp.personal.name || '',
            dob: fullEmp.personal.dob ? new Date(fullEmp.personal.dob).toISOString().split('T')[0] : '',
            gender: fullEmp.personal.gender || 'Male',
            photo: fullEmp.personal.photo || '',
            maritalStatus: fullEmp.personal.maritalStatus || 'Single',
            nationality: fullEmp.personal.nationality || 'Indian'
          },
          contact: {
            personalEmail: fullEmp.contact.personalEmail || '',
            officialEmail: fullEmp.contact.officialEmail || '',
            phone: fullEmp.contact.phone || '',
            currentAddress: fullEmp.contact.currentAddress || '',
            permanentAddress: fullEmp.contact.permanentAddress || '',
            emergencyContact: {
              name: fullEmp.contact.emergencyContact?.name || '',
              relation: fullEmp.contact.emergencyContact?.relation || '',
              phone: fullEmp.contact.emergencyContact?.phone || ''
            }
          },
          employment: {
            dateOfJoining: fullEmp.employment.dateOfJoining ? new Date(fullEmp.employment.dateOfJoining).toISOString().split('T')[0] : '',
            employmentType: fullEmp.employment.employmentType || 'Full-Time',
            department: fullEmp.employment.department || '',
            designation: fullEmp.employment.designation || '',
            grade: fullEmp.employment.grade || 'G1',
            location: fullEmp.employment.location || 'Mumbai',
            managerId: fullEmp.employment.managerId?._id || fullEmp.employment.managerId || '',
            shiftId: fullEmp.employment.shiftId || 'shift_general'
          },
          bank: {
            accountName: fullEmp.bank?.accountName || '',
            accountNumber: fullEmp.bank?.accountNumber || '',
            bankName: fullEmp.bank?.bankName || '',
            ifscCode: fullEmp.bank?.ifscCode || '',
            panNumber: fullEmp.bank?.panNumber || '',
            aadhaarNumber: fullEmp.bank?.aadhaarNumber || '',
            pfNumber: fullEmp.bank?.pfNumber || '',
            esiNumber: fullEmp.bank?.esiNumber || '',
            uanNumber: fullEmp.bank?.uanNumber || ''
          }
        });
        setSelectedEmpId(emp._id);
        setModalMode('edit');
        setActiveTab('personal');
        setErrorMessage('');
        setSuccessMessage('');
        setShowModal(true);
      }
    } catch (err) {
      alert('Failed to load employee details');
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, subSection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let res;
      if (modalMode === 'add') {
        res = await apiCall('/employees', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      } else {
        res = await apiCall(`/employees/${selectedEmpId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      }

      if (res.success) {
        setSuccessMessage(modalMode === 'add' ? 'Employee successfully onboarded!' : 'Employee profile updated successfully!');
        fetchEmployees();
        setTimeout(() => setShowModal(false), 1500);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Action failed.');
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Employee Management</h1>
          <p style={{ color: '#9ca3af' }}>Onboard new talent, manage positions, roles, and profiles.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={18} />
          <span>Onboard Employee</span>
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '4rem' }}>Loading directory records...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af' }}>No employees onboarded yet.</td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp._id}>
                    <td>{emp.employeeId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{emp.personal.name}</strong>
                      </div>
                    </td>
                    <td>{emp.employment.department}</td>
                    <td>{emp.employment.designation}</td>
                    <td>{new Date(emp.employment.dateOfJoining).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${emp.status === 'Active' ? 'success' : 'warning'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem'
        }}>
          <div className="glass-container" style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#111827',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {modalMode === 'add' ? 'Onboard New Employee' : 'Edit Employee Profile'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.5rem',
              gap: '1.5rem'
            }}>
              {['personal', 'contact', 'employment', 'bank'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    paddingBottom: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: activeTab === tab ? '#06b6d4' : '#9ca3af',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid #06b6d4' : '2px solid transparent'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }}>
              {activeTab === 'personal' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Employee ID Code</label>
                    <input 
                      type="text" 
                      value={formData.employeeId} 
                      onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                      disabled={modalMode === 'edit'}
                      required 
                    />
                  </div>
                  <div>
                    <label>User Login Role</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                      <option value="Employee">Employee</option>
                      <option value="Manager">Reporting Manager</option>
                      <option value="HR">HR / Admin</option>
                      <option value="Leadership">Leadership / Management</option>
                    </select>
                  </div>
                  <div>
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={formData.personal.name} 
                      onChange={(e) => handleInputChange('personal', 'name', e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label>Date of Birth</label>
                    <input 
                      type="date" 
                      value={formData.personal.dob} 
                      onChange={(e) => handleInputChange('personal', 'dob', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>Gender</label>
                    <select value={formData.personal.gender} onChange={(e) => handleInputChange('personal', 'gender', e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label>Marital Status</label>
                    <select value={formData.personal.maritalStatus} onChange={(e) => handleInputChange('personal', 'maritalStatus', e.target.value)}>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>Personal Email (Login Email)</label>
                      <input 
                        type="email" 
                        value={formData.contact.personalEmail} 
                        onChange={(e) => handleInputChange('contact', 'personalEmail', e.target.value)} 
                        disabled={modalMode === 'edit'}
                        required 
                      />
                    </div>
                    <div>
                      <label>Official Email</label>
                      <input 
                        type="email" 
                        value={formData.contact.officialEmail} 
                        onChange={(e) => handleInputChange('contact', 'officialEmail', e.target.value)} 
                      />
                    </div>
                    <div>
                      <label>Phone Number</label>
                      <input 
                        type="text" 
                        value={formData.contact.phone} 
                        onChange={(e) => handleInputChange('contact', 'phone', e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label>Current Address</label>
                    <textarea 
                      rows="2"
                      value={formData.contact.currentAddress} 
                      onChange={(e) => handleInputChange('contact', 'currentAddress', e.target.value)} 
                    />
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Emergency Contact</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label>Contact Name</label>
                        <input 
                          type="text" 
                          value={formData.contact.emergencyContact.name} 
                          onChange={(e) => handleNestedInputChange('contact', 'emergencyContact', 'name', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label>Relation</label>
                        <input 
                          type="text" 
                          value={formData.contact.emergencyContact.relation} 
                          onChange={(e) => handleNestedInputChange('contact', 'emergencyContact', 'relation', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label>Phone</label>
                        <input 
                          type="text" 
                          value={formData.contact.emergencyContact.phone} 
                          onChange={(e) => handleNestedInputChange('contact', 'emergencyContact', 'phone', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'employment' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Department</label>
                    <input 
                      type="text" 
                      placeholder="Engineering, Sales, HR..."
                      value={formData.employment.department} 
                      onChange={(e) => handleInputChange('employment', 'department', e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label>Designation</label>
                    <input 
                      type="text" 
                      placeholder="Software Engineer, Consultant..."
                      value={formData.employment.designation} 
                      onChange={(e) => handleInputChange('employment', 'designation', e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label>Employment Type</label>
                    <select value={formData.employment.employmentType} onChange={(e) => handleInputChange('employment', 'employmentType', e.target.value)}>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label>Reporting Manager</label>
                    <select value={formData.employment.managerId} onChange={(e) => handleInputChange('employment', 'managerId', e.target.value)}>
                      <option value="">No Manager (Top Level)</option>
                      {employees
                        .filter(e => e._id !== selectedEmpId) // exclude self
                        .map(e => (
                          <option key={e._id} value={e._id}>{e.personal.name} ({e.employeeId})</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label>Date of Joining</label>
                    <input 
                      type="date" 
                      value={formData.employment.dateOfJoining} 
                      onChange={(e) => handleInputChange('employment', 'dateOfJoining', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>Grade</label>
                    <input 
                      type="text" 
                      value={formData.employment.grade} 
                      onChange={(e) => handleInputChange('employment', 'grade', e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {activeTab === 'bank' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Bank Name</label>
                    <input 
                      type="text" 
                      value={formData.bank.bankName} 
                      onChange={(e) => handleInputChange('bank', 'bankName', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>Account Holder Name</label>
                    <input 
                      type="text" 
                      value={formData.bank.accountName} 
                      onChange={(e) => handleInputChange('bank', 'accountName', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>Account Number</label>
                    <input 
                      type="text" 
                      value={formData.bank.accountNumber} 
                      onChange={(e) => handleInputChange('bank', 'accountNumber', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>IFSC Code</label>
                    <input 
                      type="text" 
                      value={formData.bank.ifscCode} 
                      onChange={(e) => handleInputChange('bank', 'ifscCode', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>PAN Card Number</label>
                    <input 
                      type="text" 
                      value={formData.bank.panNumber} 
                      onChange={(e) => handleInputChange('bank', 'panNumber', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label>Aadhaar Number</label>
                    <input 
                      type="text" 
                      value={formData.bank.aadhaarNumber} 
                      onChange={(e) => handleInputChange('bank', 'aadhaarNumber', e.target.value)} 
                    />
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '1.25rem',
                marginTop: 'auto'
              }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Confirm Onboarding' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementPage;
