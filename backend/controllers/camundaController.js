const { getUserTasks, completeUserTask, getTaskByRequestId } = require('../services/camundaService');
const db = require('../config/database');

/**
 * Get all user tasks for the current user
 */
const getMyTasks = async (req, res) => {
  try {
    const tasks = await getUserTasks(req.user.username);
    
    // Enrich tasks with request details
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const requestId = task.variables.requestId?.value;
        const request = requestId ? db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) : null;
        
        return {
          ...task,
          request
        };
      })
    );
    
    res.json(enrichedTasks);
  } catch (error) {
    console.error('Failed to get user tasks:', error);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
};

/**
 * Get task for a specific request
 */
const getRequestTask = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const task = await getTaskByRequestId(requestId);
    
    if (!task) {
      return res.status(404).json({ error: 'No active task found for this request' });
    }
    
    // Enrich with request details
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    
    res.json({
      task,
      request
    });
  } catch (error) {
    console.error('Failed to get request task:', error);
    res.status(500).json({ error: 'Failed to retrieve task' });
  }
};

/**
 * Complete approval task
 */
const completeApproval = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { approved, reason } = req.body;
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'approved field must be a boolean' });
    }
    
    // Get task details to get request ID
    const tasks = await getUserTasks(req.user.username);
    const task = tasks.find(t => t.userTaskKey === taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }
    
    const requestId = task.variables.requestId?.value;
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found for this task' });
    }
    
    // Complete the task with approval decision
    const result = await completeUserTask(taskId, {
      approved,
      reason: reason || (approved ? 'Request approved' : 'Request rejected'),
      userId: req.user.id,
      approverRole: req.user.role
    });
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({
      message: approved ? 'Request approved' : 'Request rejected',
      requestId,
      taskId
    });
  } catch (error) {
    console.error('Failed to complete approval:', error);
    res.status(500).json({ error: 'Failed to complete approval' });
  }
};

module.exports = {
  getMyTasks,
  getRequestTask,
  completeApproval
};
