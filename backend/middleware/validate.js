const validateRequest = (req, res, next) => {
  const { title, description, category, priority } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (title.length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters' });
  }

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required' });
  }

  if (description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  if (!category || category.trim().length === 0) {
    return res.status(400).json({ error: 'Category is required' });
  }

  if (!priority || priority.trim().length === 0) {
    return res.status(400).json({ error: 'Priority is required' });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  const validCategories = ['Hardware', 'Software', 'Network', 'Access', 'Other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  next();
};

const validateStatusChange = (req, res, next) => {
  const { status } = req.body;

  if (!status || status.trim().length === 0) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['New', 'In Progress', 'Done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  next();
};

module.exports = { validateRequest, validateStatusChange };
