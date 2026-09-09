import './Badge.css';

const Badge = ({ type, value }) => {
  const getBadgeClass = () => {
    if (type === 'status') {
      switch (value) {
        case 'Pending':
          return 'badge-status-pending';
        case 'In Progress':
          return 'badge-status-in-progress';
        case 'Completed':
          return 'badge-status-completed';
        default:
          return 'badge-status-default';
      }
    } else if (type === 'priority') {
      switch (value) {
        case 'Low':
          return 'badge-priority-low';
        case 'Medium':
          return 'badge-priority-medium';
        case 'High':
          return 'badge-priority-high';
        case 'Urgent':
          return 'badge-priority-urgent';
        default:
          return 'badge-priority-default';
      }
    }
    return '';
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      {value}
    </span>
  );
};

export default Badge;
