export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Pending':
      return '#f59e0b';
    case 'In Progress':
      return '#3b82f6';
    case 'Completed':
      return '#10b981';
    default:
      return '#6b7280';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Low':
      return '#6b7280';
    case 'Medium':
      return '#f59e0b';
    case 'High':
      return '#f97316';
    case 'Urgent':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};
