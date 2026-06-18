import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Mail, Phone, MapPin, Network, ListFilter } from 'lucide-react';

const Directory = () => {
  const { apiCall } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'org'
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

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

  const departments = [...new Set(employees.map(emp => emp.employment.department))].filter(Boolean);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.personal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.employment.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter ? emp.employment.department === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  // --- ORG CHART RENDERING LOGIC ---
  // Helper to build hierarchy tree
  const buildTree = () => {
    const map = {};
    employees.forEach(emp => {
      map[emp._id] = { ...emp, children: [] };
    });

    const roots = [];
    employees.forEach(emp => {
      const managerId = emp.employment.managerId?._id || emp.employment.managerId;
      if (managerId && map[managerId]) {
        map[managerId].children.push(map[emp._id]);
      } else {
        roots.push(map[emp._id]);
      }
    });

    return roots;
  };

  // Recursive Node component
  const OrgNode = ({ node, level = 0 }) => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 1rem'
      }}>
        {/* Card */}
        <div className="glass-card" style={{
          padding: '1rem',
          minWidth: '200px',
          textAlign: 'center',
          borderColor: level === 0 ? '#06b6d4' : 'rgba(255, 255, 255, 0.08)',
          boxShadow: level === 0 ? '0 0 15px rgba(6, 182, 212, 0.2)' : 'none',
          backgroundColor: '#1f2937',
          zIndex: 2
        }}>
          <h4 style={{ fontSize: '0.95rem', color: '#fff' }}>{node.personal.name}</h4>
          <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600, marginTop: '0.25rem' }}>
            {node.employment.designation}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
            {node.employment.department}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.1rem' }}>
            ID: {node.employeeId}
          </div>
        </div>

        {/* Connector lines and children */}
        {node.children && node.children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '1rem' }}>
            {/* Vertical stem line down */}
            <div style={{ width: '2px', height: '20px', backgroundColor: 'rgba(99, 102, 241, 0.4)' }} />
            
            {/* Horizontal branch line */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              position: 'relative'
            }}>
              {node.children.map((child, idx) => (
                <div key={child._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Left-right horizontal connectors */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: idx === 0 ? '50%' : 0,
                    right: idx === node.children.length - 1 ? '50%' : 0,
                    height: '2px',
                    backgroundColor: 'rgba(99, 102, 241, 0.4)'
                  }} />
                  {/* Small vertical stem down to child card */}
                  <div style={{ width: '2px', height: '15px', backgroundColor: 'rgba(99, 102, 241, 0.4)' }} />
                  
                  <OrgNode node={child} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Title Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Employee Directory</h1>
          <p style={{ color: '#9ca3af' }}>Search colleagues, departments, and reporting hierarchies.</p>
        </div>

        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#111827',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: viewMode === 'list' ? '#6366f1' : 'transparent',
              color: viewMode === 'list' ? '#fff' : '#9ca3af',
              transition: 'all 0.2s'
            }}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('org')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: viewMode === 'org' ? '#6366f1' : 'transparent',
              color: viewMode === 'org' ? '#fff' : '#9ca3af',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Network size={14} />
              Org Chart
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '4rem' }}>Loading directory...</div>
      ) : (
        <>
          {/* SEARCH & FILTERS BAR */}
          {viewMode === 'list' && (
            <div className="glass-card" style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '1.25rem'
            }}>
              <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Search by name, ID, or designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>

              <div style={{ minWidth: '180px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}>
                  <ListFilter size={16} />
                </span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* RENDERING LIST VIEW */}
          {viewMode === 'list' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}>
              {filteredEmployees.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>
                  No employees found matching the filters.
                </div>
              ) : (
                filteredEmployees.map(emp => (
                  <div key={emp._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(99, 102, 241, 0.2)',
                        overflow: 'hidden'
                      }}>
                        {emp.personal.photo ? (
                          <img src={emp.personal.photo} alt={emp.personal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontWeight: 700, color: '#6366f1' }}>{emp.personal.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{emp.personal.name}</h3>
                        <span style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>{emp.employment.designation}</span>
                      </div>
                    </div>

                    <div style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: '#9ca3af'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#6b7280' }}>ID:</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{emp.employeeId}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#6b7280' }}>Dept:</span>
                        <span>{emp.employment.department}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={12} style={{ color: '#6b7280' }} />
                        <span>{emp.contact.officialEmail || emp.contact.personalEmail}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={12} style={{ color: '#6b7280' }} />
                        <span>{emp.contact.phone}</span>
                      </div>
                      {emp.employment.managerId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ color: '#6b7280' }}>Reports to:</span>
                          <span style={{ color: '#6366f1', fontWeight: 600 }}>
                            {emp.employment.managerId.personal?.name || 'Manager'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* RENDERING ORG CHART VIEW */}
          {viewMode === 'org' && (
            <div style={{
              width: '100%',
              overflowX: 'auto',
              padding: '2rem 1rem',
              backgroundColor: '#111827',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center' }}>
                {buildTree().map(root => (
                  <OrgNode key={root._id} node={root} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Directory;
