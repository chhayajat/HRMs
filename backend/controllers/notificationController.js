const Notification = require('../models/Notification');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      tenantId: req.tenantId,
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching notifications', error: error.message });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error updating notification', error: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { tenantId: req.tenantId, userId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error updating notifications', error: error.message });
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead
};
