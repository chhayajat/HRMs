import { useSelector, useDispatch } from 'react-redux';
import { loginUser, registerTenantUser, logout, updateUser } from '../services/slices/authSlice';
import { apiCall as rawApiCall } from '../apis/apiClient';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  const login = async (email, password) => {
    const result = await dispatch(loginUser({ email, password })).unwrap();
    return result.user;
  };

  const registerTenant = async (tenantName, name, email, password) => {
    const result = await dispatch(registerTenantUser({ tenantName, name, email, password })).unwrap();
    return result.user;
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleUpdateUser = (updatedUser) => {
    dispatch(updateUser(updatedUser));
  };

  return {
    user,
    token,
    loading,
    error,
    login,
    registerTenant,
    logout: handleLogout,
    setUser: handleUpdateUser,
    apiCall: rawApiCall
  };
};
export default useAuth;
