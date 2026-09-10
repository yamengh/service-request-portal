import { useNotifications } from '../context/NotificationsContext';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/formatters';
import './Notifications.css';

const Notifications = () => {
  const { notifications, loading, error, markAsRead, fetchNotifications } = useNotifications();

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Notifications</h1>
        </div>
        <div className="loading-state">Loading notifications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Notifications</h1>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">No notifications yet</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.status === 'unread' ? 'notification-unread' : ''}`}
            >
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <div className="notification-meta">
                  <span className="notification-time">{formatDateTime(notification.created_at)}</span>
                  <Link to={`/requests/${notification.request_id}`} className="notification-link">
                    View Request
                  </Link>
                </div>
              </div>
              {notification.status === 'unread' && (
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="notification-read-button"
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
