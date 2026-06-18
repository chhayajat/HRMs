import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../apis/apiClient';

export const loadMe = createAsyncThunk('auth/loadMe', async (token, { rejectWithValue }) => {
  try {
    const data = await fetch('http://localhost:5000/api/auth/me', {
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
      console.log('[authSlice] logout - clearing localStorage');
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
      // Load Me
      .addCase(loadMe.pending, (state) => {
        console.log('[authSlice] loadMe.pending');
        state.loading = true;
      })
      .addCase(loadMe.fulfilled, (state, action) => {
        console.log('[authSlice] loadMe.fulfilled - saving token to localStorage');
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
        localStorage.setItem('hrms_token', action.payload.token);
        console.log('[authSlice] hrms_token saved to localStorage');
        if (action.payload.user?.tenantId) {
          localStorage.setItem('hrms_tenant_id', action.payload.user.tenantId);
          console.log('[authSlice] hrms_tenant_id saved to localStorage:', action.payload.user.tenantId);
        }
      })
      .addCase(loadMe.rejected, (state, action) => {
        console.log('[authSlice] loadMe.rejected - clearing localStorage');
        state.user = null;
        state.token = null;
        state.loading = false;
        localStorage.removeItem('hrms_token');
        localStorage.removeItem('hrms_tenant_id');
        console.log('[authSlice] localStorage cleared due to loadMe failure:', action.payload);
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        console.log('[authSlice] loginUser.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log('[authSlice] loginUser.fulfilled - saving to localStorage');
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
        localStorage.setItem('hrms_token', action.payload.token);
        localStorage.setItem('hrms_tenant_id', action.payload.user.tenantId);
        console.log('[authSlice] Login - hrms_token saved:', !!action.payload.token);
        console.log('[authSlice] Login - hrms_tenant_id saved:', !!action.payload.user?.tenantId);
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.log('[authSlice] loginUser.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload;
      })
      // Register Tenant
      .addCase(registerTenantUser.pending, (state) => {
        console.log('[authSlice] registerTenantUser.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(registerTenantUser.fulfilled, (state, action) => {
        console.log('[authSlice] registerTenantUser.fulfilled - saving to localStorage');
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
        localStorage.setItem('hrms_token', action.payload.token);
        localStorage.setItem('hrms_tenant_id', action.payload.user.tenantId);
        console.log('[authSlice] Register - hrms_token saved:', !!action.payload.token);
        console.log('[authSlice] Register - hrms_tenant_id saved:', !!action.payload.user?.tenantId);
      })
      .addCase(registerTenantUser.rejected, (state, action) => {
        console.log('[authSlice] registerTenantUser.rejected:', action.payload);
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
