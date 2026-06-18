import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Sparkles, DollarSign, Target, Briefcase, FileCheck, Receipt,
  GraduationCap, Laptop, Brain, Headphones, Plug, Smartphone,
  Search, AlertTriangle, Shield, Loader2
} from 'lucide-react';

const MODULE_ICONS = {
  payroll: DollarSign,
  performance: Target,
  recruitment: Briefcase,
  onboarding: FileCheck,
  expenses: Receipt,
  learning: GraduationCap,
  assets: Laptop,
  'ai-analytics': Brain,
  helpdesk: Headphones,
  integrations: Plug,
  mobile: Smartphone
};

const AdvisoryBanner = ({ confidence, provider }) => (
  <div style={{
    padding: '1rem 1.25rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem'
  }}>
    <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
    <div>
      <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.875rem' }}>Advisory Only — Human Approval Required</div>
      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
        All AI outputs are advisory. Confidence: {confidence != null ? `${Math.round(confidence * 100)}%` : 'N/A'} · Provider: {provider || 'local'}
      </div>
    </div>
  </div>
);

const FeatureList = ({ features }) => (
  <ul style={{ paddingLeft: '1.25rem', color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.8 }}>
    {features.map((f) => <li key={f}>{f}</li>)}
  </ul>
);

const AIAnalyticsHubPage = () => {
  const { apiCall } = useAuth();
  const [modules, setModules] = useState([]);
  const [activeKey, setActiveKey] = useState('ai-analytics');
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [insights, setInsights] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [moduleInsight, setModuleInsight] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [screenResult, setScreenResult] = useState(null);

  const activeModule = modules.find((m) => m.key === activeKey);

  useEffect(() => {
    const init = async () => {
      try {
        const [modRes, statusRes, empRes] = await Promise.all([
          apiCall('/ai/modules'),
          apiCall('/ai/status'),
          apiCall('/ai/employees')
        ]);
        if (modRes.success) setModules(modRes.data.modules || []);
        if (statusRes.success) setAiStatus(statusRes.data);
        if (empRes.success) setEmployees(empRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    setModuleInsight(null);
    setSearchResult(null);
    setInsights(null);
    setAnomalies(null);
    setEmployeeSummary(null);
    setScreenResult(null);

    if (activeKey === 'ai-analytics') {
      loadAiInsights();
    } else if (activeKey !== 'recruitment') {
      loadModuleInsight(activeKey);
    }
  }, [activeKey]);

  const loadModuleInsight = async (key) => {
    setLoading(true);
    try {
      const res = await apiCall(`/ai/module/${key}/insights`);
      if (res.success) setModuleInsight(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAiInsights = async () => {
    setLoading(true);
    try {
      const [insRes, anomRes] = await Promise.all([
        apiCall('/ai/workforce-insights'),
        apiCall('/ai/attendance-anomalies')
      ]);
      if (insRes.success) setInsights(insRes.data);
      if (anomRes.success) setAnomalies(anomRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await apiCall('/ai/search', { method: 'POST', body: JSON.stringify({ query: searchQuery }) });
      if (res.success) setSearchResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSummary = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const res = await apiCall(`/ai/employee/${selectedEmployee}/summary`);
      if (res.success) setEmployeeSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScreenResume = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiCall('/ai/recruitment/screen', {
        method: 'POST',
        body: JSON.stringify({ jobTitle, resumeText })
      });
      if (res.success) setScreenResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderModuleContent = () => {
    if (loading && !moduleInsight && !insights) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem' }}>Loading AI insights...</p>
        </div>
      );
    }

    if (activeKey === 'ai-analytics') {
      return (
        <div>
          <AdvisoryBanner confidence={insights?.confidence} provider={insights?.provider} />

          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} /> Smart Employee Search
            </h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                placeholder='Try "Engineering" or employee name...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>Search</button>
            </form>
            {searchResult && (
              <div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{searchResult.data?.summary}</p>
                {searchResult.data?.results?.map((r) => (
                  <div key={r.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}>
                    <strong>{r.name}</strong> · {r.employeeId} · {r.department} · {r.designation}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Workforce Insights</h3>
              {insights?.data && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{insights.data.headcount?.active}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Active</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(6,182,212,0.1)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4' }}>{insights.data.headcount?.total}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Total</div>
                    </div>
                  </div>
                  {insights.data.recommendations?.map((r, i) => (
                    <p key={i} style={{ fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.5rem' }}>• {r}</p>
                  ))}
                  {insights.data.aiNarrative && (
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.75rem', fontStyle: 'italic' }}>{insights.data.aiNarrative}</p>
                  )}
                </>
              )}
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Attendance Anomalies</h3>
              {anomalies?.data?.anomalies?.length === 0 && (
                <p style={{ color: '#10b981', fontSize: '0.875rem' }}>No anomalies detected in the last 30 days.</p>
              )}
              {anomalies?.data?.anomalies?.map((a, i) => (
                <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                  <strong>{a.name}</strong> — Late: {a.lateDays}, Absent: {a.absentDays}
                  <div style={{ color: '#9ca3af', marginTop: '0.25rem' }}>{a.suggestion}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>AI Employee Summary</h3>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ flex: 1 }}>
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" onClick={handleEmployeeSummary} disabled={!selectedEmployee || loading}>
                Generate
              </button>
            </div>
            {employeeSummary?.data?.summary && (
              <p style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.6 }}>{employeeSummary.data.summary}</p>
            )}
          </div>
        </div>
      );
    }

    if (activeKey === 'recruitment') {
      return (
        <div>
          <AdvisoryBanner confidence={screenResult?.confidence} provider={screenResult?.provider} />
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{activeModule?.title}</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>{activeModule?.description}</p>
            <FeatureList features={activeModule?.features || []} />
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>AI Resume Screening</h3>
            <form onSubmit={handleScreenResume}>
              <input
                placeholder="Job title (e.g. Software Engineer)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                style={{ width: '100%', marginBottom: '0.75rem' }}
              />
              <textarea
                placeholder="Paste resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                style={{ width: '100%', marginBottom: '0.75rem', resize: 'vertical' }}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>Screen Resume</button>
            </form>
            {screenResult?.data && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                  Match Score: {Math.round((screenResult.data.matchScore || 0) * 100)}%
                </div>
                <p style={{ fontSize: '0.875rem', color: '#d1d5db' }}>{screenResult.data.recommendation}</p>
                {screenResult.data.strengths && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                    Strengths: {screenResult.data.strengths.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        {moduleInsight && <AdvisoryBanner confidence={moduleInsight.confidence} provider={moduleInsight.provider} />}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{activeModule?.title}</h3>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              backgroundColor: activeModule?.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: activeModule?.status === 'active' ? '#10b981' : '#f59e0b'
            }}>
              {activeModule?.status === 'active' ? 'Active' : 'Paid Add-on'}
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{activeModule?.description}</p>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Key Features</h4>
          <FeatureList features={activeModule?.features || []} />
          {moduleInsight?.data?.insight && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={14} /> AI Readiness Insight
              </div>
              <p style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.6 }}>{moduleInsight.data.insight}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={28} style={{ color: '#6366f1' }} /> AI Analytics Hub
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Phase 2 modules with advisory AI intelligence · Sections 7.1 – 7.11
          </p>
        </div>
        {aiStatus && (
          <div style={{
            padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem',
            backgroundColor: aiStatus.aiConfigured ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: aiStatus.aiConfigured ? '#10b981' : '#f59e0b', border: '1px solid currentColor'
          }}>
            {aiStatus.aiConfigured ? `AI: ${aiStatus.model}` : 'AI: Local mode (add OPENAI_API_KEY to .env)'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', minHeight: '600px' }}>
        <div style={{
          width: '260px', flexShrink: 0, backgroundColor: '#111827',
          borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', overflowY: 'auto'
        }}>
          {modules.map((mod) => {
            const Icon = MODULE_ICONS[mod.key] || Sparkles;
            const isActive = activeKey === mod.key;
            return (
              <button
                key={mod.key}
                onClick={() => setActiveKey(mod.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.75rem 0.85rem', marginBottom: '0.25rem', borderRadius: '8px',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: isActive ? '#fff' : '#9ca3af',
                  fontWeight: isActive ? 600 : 500, fontSize: '0.8rem',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent'
                }}
              >
                <Icon size={16} style={{ color: isActive ? '#6366f1' : '#6b7280', flexShrink: 0 }} />
                <span>{mod.id} {mod.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {renderModuleContent()}
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsHubPage;
