import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../apis/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const loadMe = createAsyncThunk('auth/loadMe', async (token, { rejectWithValue }) => {
  try {
    const data = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const result = await data.json();
    if (!data.ok) {
      throw new Error(result.message || 'Failed to fetch user');
    }
    return { user: result.user, token };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return res;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const registerTenantUser = createAsyncThunk('auth/registerTenant', async ({ tenantName, name, email, password }, { rejectWithValue }) => {
  try {
    const res = await apiCall('/auth/register-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantName, name, email, password })
    });
    return res;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const token = localStorage.getItem('hrms_token');
const initialState = {
  user: null,
  token: token || null,
  loading: !!token,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_tenant_id');
    },
    clearError(state) {
      state.error = null;
    },
    updateUser(state, action) {
      state.user = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
        localStorage.setItem('hrms_token', action.payload.token);
        if (action.payload.user?.tenantId) {
          localStorage.setItem('hrms_tenant_id', action.payload.user.tenantId);
        }
      })
      .addCase(loadMe.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.loading = false;
        localStorage.removeItem('hrms_token');
        localStorage.removeItem('hrms_tenant_id');
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
        localStorage.setItem('hrms_token', action.payload.token);
        localStorage.setItem('hrms_tenant_id', action.payload.user.tenantId);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerTenantUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerTenantUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
        localStorage.setItem('hrms_token', action.payload.token);
        localStorage.setItem('hrms_tenant_id', action.payload.user.tenantId);
      })
      .addCase(registerTenantUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
