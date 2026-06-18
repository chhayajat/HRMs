import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../apis/apiClient';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await apiCall('/notifications');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    const res = await apiCall(`/notifications/${id}/read`, { method: 'PUT' });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await apiCall('/notifications/read-all', { method: 'PUT' });
    return true;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.read).length;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark Read
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n._id === action.payload._id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
          state.unreadCount = state.notifications.filter(n => !n.read).length;
        }
      })
      // Mark All Read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications.forEach(n => { n.read = true; });
        state.unreadCount = 0;
      });
  }
});

export default notificationSlice.reducer;
