import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/slices/notificationSlice';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading, error } = useSelector((state) => state.notifications);

  const getNotifications = () => {
    dispatch(fetchNotifications());
  };

  const readNotification = (id) => {
    dispatch(markNotificationRead(id));
  };

  const readAllNotifications = () => {
    dispatch(markAllNotificationsRead());
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    getNotifications,
    readNotification,
    readAllNotifications
  };
};
export default useNotifications;
