const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');

const isAiEnabled = () => process.env.AI_ENABLED !== 'false';

const hasOpenAiKey = () => Boolean(process.env.OPENAI_API_KEY);

const advisoryWrap = (data, confidence = 0.75) => ({
  advisory: true,
  confidence,
  requiresApproval: true,
  provider: hasOpenAiKey() ? process.env.AI_PROVIDER || 'openai' : 'local',
  generatedAt: new Date().toISOString(),
  data
});

const callOpenAi = async (systemPrompt, userPrompt) => {
  if (!hasOpenAiKey()) return null;

  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const isOpenRouter = provider === 'openrouter';

  const url = isOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
  };

  if (isOpenRouter) {
    headers['HTTP-Referer'] = process.env.FRONTEND_URL || 'http://localhost:5173';
    headers['X-Title'] = 'Gravity HRMS';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3')
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${isOpenRouter ? 'OpenRouter' : 'OpenAI'} API error: ${err}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content?.trim() || '';
};

const MODULES = [
  {
    id: '7.1',
    key: 'payroll',
    title: 'Payroll & Compliance',
    description: 'Salary structures, pay runs, statutory deductions (PF/ESI/TDS/PT), LOP integration.',
    status: 'add-on',
    features: ['Salary structure setup', 'Payslip generation', 'Statutory reports', 'LOP from leave & attendance']
  },
  {
    id: '7.2',
    key: 'performance',
    title: 'Performance Management',
    description: 'Goals, OKRs, review cycles, 360° feedback, and calibration.',
    status: 'add-on',
    features: ['Goals / OKRs / KRAs', 'Review cycles', '360° feedback', 'Performance history']
  },
  {
    id: '7.3',
    key: 'recruitment',
    title: 'Recruitment / ATS',
    description: 'Job postings, candidate pipeline, interviews, and offer management.',
    status: 'add-on',
    features: ['Job postings', 'Candidate pipeline', 'Interview scheduling', 'Offer to employee conversion']
  },
  {
    id: '7.4',
    key: 'onboarding',
    title: 'Onboarding & Document Management',
    description: 'Checklists, document vault, e-sign, and pre-boarding.',
    status: 'add-on',
    features: ['Onboarding checklists', 'Document vault', 'E-sign & verification', 'Pre-boarding tasks']
  },
  {
    id: '7.5',
    key: 'expenses',
    title: 'Expense & Reimbursement / Travel',
    description: 'Expense claims, travel requests, and payroll/finance integration.',
    status: 'add-on',
    features: ['Expense claims', 'Policy limits', 'Travel approvals', 'Finance integration']
  },
  {
    id: '7.6',
    key: 'learning',
    title: 'Learning & Development (LMS)',
    description: 'Courses, certifications, and training progress tracking.',
    status: 'add-on',
    features: ['Courses & assignments', 'Certifications', 'Training records', 'Progress tracking']
  },
  {
    id: '7.7',
    key: 'assets',
    title: 'Asset Management',
    description: 'Track laptops, devices, and asset lifecycle per employee.',
    status: 'add-on',
    features: ['Issue & return tracking', 'Asset lifecycle', 'Assignment history']
  },
  {
    id: '7.8',
    key: 'ai-analytics',
    title: 'AI & Analytics',
    description: 'Advisory intelligence on HR data with confidence scores and human approval.',
    status: 'active',
    features: ['Smart employee search', 'AI summaries', 'Workforce planning', 'Attrition & burnout flags', 'Attendance anomalies', 'Resume screening']
  },
  {
    id: '7.9',
    key: 'helpdesk',
    title: 'Helpdesk / HR Tickets',
    description: 'Employee HR queries with SLA tracking and knowledge base.',
    status: 'add-on',
    features: ['Ticketing with SLA', 'Knowledge base', 'FAQ self-service']
  },
  {
    id: '7.10',
    key: 'integrations',
    title: 'Integrations',
    description: 'Biometric, SSO, calendar, accounting, and chat integrations.',
    status: 'add-on',
    features: ['Biometric devices', 'SSO (SAML/OAuth)', 'Calendar sync', 'Tally/QuickBooks', 'Slack/Teams']
  },
  {
    id: '7.11',
    key: 'mobile',
    title: 'Mobile App',
    description: 'Native mobile access to attendance, leave, approvals, and notifications.',
    status: 'add-on',
    features: ['Mobile attendance', 'Leave on mobile', 'Approvals', 'Push notifications']
  }
];

const getModules = () => ({
  modules: MODULES,
  aiConfigured: hasOpenAiKey(),
  aiEnabled: isAiEnabled()
});

const smartSearch = async (tenantId, query) => {
  const employees = await Employee.find({ tenantId });
  const q = query.toLowerCase();

  const matches = employees.filter((emp) => {
    const haystack = [
      emp.personal?.name,
      emp.employeeId,
      emp.contact?.personalEmail,
      emp.contact?.officialEmail,
      emp.employment?.department,
      emp.employment?.designation,
      emp.employment?.location,
      emp.status
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q) || q.split(' ').every((word) => haystack.includes(word));
  });

  let aiSummary = null;
  if (hasOpenAiKey() && matches.length > 0) {
    aiSummary = await callOpenAi(
      'You are an HR analytics assistant. Be concise and advisory only.',
      `User searched: "${query}". Found ${matches.length} employees. Summarize the result in 2 sentences.`
    );
  }

  return advisoryWrap({
    query,
    count: matches.length,
    results: matches.slice(0, 20).map((e) => ({
      id: e._id,
      employeeId: e.employeeId,
      name: e.personal?.name,
      department: e.employment?.department,
      designation: e.employment?.designation,
      status: e.status
    })),
    summary: aiSummary || `Found ${matches.length} employee(s) matching "${query}".`
  }, matches.length > 0 ? 0.82 : 0.55);
};

const getWorkforceInsights = async (tenantId) => {
  const employees = await Employee.find({ tenantId });
  const leaves = await LeaveRequest.find({ tenantId, status: 'Approved' });
  const balances = await LeaveBalance.find({ tenantId, year: new Date().getFullYear() });

  const active = employees.filter((e) => e.status === 'Active').length;
  const probation = employees.filter((e) => e.status === 'Probation').length;
  const onboarding = employees.filter((e) => e.status === 'Onboarding').length;

  const deptCounts = {};
  employees.forEach((e) => {
    const dept = e.employment?.department || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const highLeaveUsers = balances
    .map((b) => {
      const used = b.balances?.reduce((s, x) => s + (x.used || 0), 0) || 0;
      const emp = employees.find((e) => e._id?.toString() === b.employeeId?.toString());
      return { name: emp?.personal?.name, used, employeeId: emp?.employeeId };
    })
    .filter((x) => x.name)
    .sort((a, b) => b.used - a.used)
    .slice(0, 5);

  const insights = {
    headcount: { active, probation, onboarding, total: employees.length },
    departmentBreakdown: deptCounts,
    approvedLeavesYtd: leaves.length,
    highLeaveUtilization: highLeaveUsers,
    recommendations: [
      probation > 0 ? `${probation} employee(s) on probation — schedule review checkpoints.` : null,
      onboarding > 0 ? `${onboarding} employee(s) in onboarding — verify checklist completion.` : null,
      highLeaveUsers[0]?.used > 10 ? `${highLeaveUsers[0].name} has high leave utilization — check burnout risk.` : null
    ].filter(Boolean),
    skillGapAnalysis: 'Advisory: Cross-reference department headcount with project demand to identify hiring gaps.',
    attritionRisk: employees.filter((e) => e.status === 'Probation').map((e) => ({
      name: e.personal?.name,
      risk: 'Medium',
      reason: 'Probation period — monitor engagement and manager feedback.'
    }))
  };

  if (hasOpenAiKey()) {
    insights.aiNarrative = await callOpenAi(
      'You are an HR workforce planning advisor. Output advisory insights only.',
      `Workforce data: ${JSON.stringify({ active, probation, onboarding, deptCounts, highLeaveUsers })}. Provide 3 bullet recommendations.`
    );
  }

  return advisoryWrap(insights, 0.78);
};

const getAttendanceAnomalies = async (tenantId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startStr = thirtyDaysAgo.toISOString().split('T')[0];

  const records = await Attendance.find({ tenantId, date: { $gte: startStr } });
  const employees = await Employee.find({ tenantId });

  const lateCounts = {};
  const absentCounts = {};

  records.forEach((r) => {
    const empId = r.employeeId?.toString();
    if (r.status === 'Late') lateCounts[empId] = (lateCounts[empId] || 0) + 1;
    if (r.status === 'Absent') absentCounts[empId] = (absentCounts[empId] || 0) + 1;
  });

  const anomalies = employees.map((emp) => {
    const id = emp._id.toString();
    const late = lateCounts[id] || 0;
    const absent = absentCounts[id] || 0;
    if (late >= 3 || absent >= 2) {
      return {
        employeeId: emp.employeeId,
        name: emp.personal?.name,
        lateDays: late,
        absentDays: absent,
        suggestion: late >= 3
          ? 'Consider shift timing review or regularization pattern analysis.'
          : 'Follow up on absence pattern and leave balance.'
      };
    }
    return null;
  }).filter(Boolean);

  return advisoryWrap({
    period: 'Last 30 days',
    anomalyCount: anomalies.length,
    anomalies,
    regularizationSuggestions: anomalies.map((a) => ({
      employee: a.name,
      action: 'Review attendance records and approve regularization if justified.'
    }))
  }, 0.8);
};

const getEmployeeSummary = async (tenantId, employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee || employee.tenantId?.toString() !== tenantId.toString()) {
    throw new Error('Employee not found');
  }

  const leaves = await LeaveRequest.find({ tenantId, employeeId: employee._id });
  const attendance = await Attendance.find({ tenantId, employeeId: employee._id });

  const profile = {
    name: employee.personal?.name,
    employeeId: employee.employeeId,
    department: employee.employment?.department,
    designation: employee.employment?.designation,
    status: employee.status,
    leaveRequests: leaves.length,
    attendanceRecords: attendance.length,
    lateDays: attendance.filter((a) => a.status === 'Late').length
  };

  let summary = `${profile.name} (${profile.employeeId}) works in ${profile.department} as ${profile.designation}. Status: ${profile.status}. ${profile.leaveRequests} leave request(s), ${profile.lateDays} late day(s) on record.`;

  if (hasOpenAiKey()) {
    summary = await callOpenAi(
      'Generate a concise HR employee summary. Advisory only, 3-4 sentences.',
      JSON.stringify(profile)
    ) || summary;
  }

  return advisoryWrap({ profile, summary }, 0.85);
};

const screenResume = async (jobTitle, resumeText) => {
  if (!resumeText || resumeText.length < 20) {
    throw new Error('Please provide resume text (min 20 characters)');
  }

  let screening = {
    matchScore: 0.65,
    strengths: ['Relevant experience mentioned', 'Skills align partially with role'],
    gaps: ['Full skills assessment requires manual HR review'],
    recommendation: 'Advisory: Schedule screening call for human validation.'
  };

  if (hasOpenAiKey()) {
    const aiResult = await callOpenAi(
      'You are an HR resume screening assistant. Return JSON with keys: matchScore (0-1), strengths (array), gaps (array), recommendation (string). Advisory only.',
      `Job: ${jobTitle || 'General Role'}\nResume:\n${resumeText.slice(0, 4000)}`
    );
    try {
      const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());
      screening = { ...screening, ...parsed };
    } catch {
      screening.aiNotes = aiResult;
    }
  }

  return advisoryWrap(screening, screening.matchScore || 0.7);
};

const getModuleInsight = async (tenantId, moduleKey) => {
  const mod = MODULES.find((m) => m.key === moduleKey);
  if (!mod) throw new Error('Module not found');

  const employees = await Employee.find({ tenantId });
  const leaves = await LeaveRequest.find({ tenantId });

  const context = {
    module: mod.title,
    employeeCount: employees.length,
    pendingLeaves: leaves.filter((l) => l.status === 'Pending').length
  };

  let insight = `${mod.title} is a ${mod.status} module. Based on current HR data: ${context.employeeCount} employees, ${context.pendingLeaves} pending leave(s). Enable the full module for end-to-end workflows.`;

  if (hasOpenAiKey()) {
    insight = await callOpenAi(
      'You advise on HRMS module readiness. Be brief and advisory.',
      `Module: ${mod.title}. Features: ${mod.features.join(', ')}. Context: ${JSON.stringify(context)}`
    ) || insight;
  }

  return advisoryWrap({ module: mod, insight, context }, mod.status === 'active' ? 0.88 : 0.6);
};

module.exports = {
  isAiEnabled,
  hasOpenAiKey,
  getModules,
  smartSearch,
  getWorkforceInsights,
  getAttendanceAnomalies,
  getEmployeeSummary,
  screenResume,
  getModuleInsight
};
