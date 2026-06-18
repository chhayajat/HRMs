const {
  isAiEnabled,
  hasOpenAiKey,
  getModules,
  smartSearch,
  getWorkforceInsights,
  getAttendanceAnomalies,
  getEmployeeSummary,
  screenResume,
  getModuleInsight
} = require('../services/aiService');
const Employee = require('../models/Employee');

const getStatus = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      aiEnabled: isAiEnabled(),
      aiConfigured: hasOpenAiKey(),
      provider: process.env.AI_PROVIDER || 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    }
  });
};

const getModulesList = async (req, res) => {
  res.status(200).json({ success: true, data: getModules() });
};

const postSearch = async (req, res) => {
  if (!isAiEnabled()) {
    return res.status(503).json({ success: false, message: 'AI features are disabled' });
  }
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, message: 'Please provide a search query' });
  }
  try {
    const data = await smartSearch(req.tenantId, query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getInsights = async (req, res) => {
  if (!isAiEnabled()) {
    return res.status(503).json({ success: false, message: 'AI features are disabled' });
  }
  try {
    const data = await getWorkforceInsights(req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAnomalies = async (req, res) => {
  if (!isAiEnabled()) {
    return res.status(503).json({ success: false, message: 'AI features are disabled' });
  }
  try {
    const data = await getAttendanceAnomalies(req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSummary = async (req, res) => {
  if (!isAiEnabled()) {
    return res.status(503).json({ success: false, message: 'AI features are disabled' });
  }
  try {
    const data = await getEmployeeSummary(req.tenantId, req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(error.message === 'Employee not found' ? 404 : 500).json({ success: false, message: error.message });
  }
};

const postScreenResume = async (req, res) => {
  if (!isAiEnabled()) {
    return res.status(503).json({ success: false, message: 'AI features are disabled' });
  }
  const { jobTitle, resumeText } = req.body;
  try {
    const data = await screenResume(jobTitle, resumeText);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getModuleInsights = async (req, res) => {
  if (!isAiEnabled()) {
    return res.status(503).json({ success: false, message: 'AI features are disabled' });
  }
  try {
    const data = await getModuleInsight(req.tenantId, req.params.moduleKey);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(error.message === 'Module not found' ? 404 : 500).json({ success: false, message: error.message });
  }
};

const getEmployeesList = async (req, res) => {
  const employees = await Employee.find({ tenantId: req.tenantId });
  res.status(200).json({
    success: true,
    data: employees.map((e) => ({
      id: e._id,
      employeeId: e.employeeId,
      name: e.personal?.name,
      department: e.employment?.department
    }))
  });
};

module.exports = {
  getStatus,
  getModulesList,
  postSearch,
  getInsights,
  getAnomalies,
  getSummary,
  postScreenResume,
  getModuleInsights,
  getEmployeesList
};
