const { Camunda8 } = require('@camunda8/sdk');
const db = require('../config/database');
const { generateSummary } = require('./aiService');
const { createAuditLog } = require('./auditService');
const { eventBus, EventTypes } = require('./eventBus');

// Camunda 8 self-managed configuration
const CAMUNDA_CONFIG = {
  ZEEBE_GRPC_ADDRESS: process.env.ZEEBE_GRPC_ADDRESS || 'grpc://localhost:26500',
  ZEEBE_REST_ADDRESS: process.env.ZEEBE_REST_ADDRESS || 'http://localhost:8080',
  CAMUNDA_AUTH_STRATEGY: 'NONE',
  CAMUNDA_OAUTH_DISABLED: true
};

// Create Camunda client for self-managed
let camunda = null;

// Initialize client only if Camunda is enabled
if (process.env.NODE_ENV !== 'test' && process.env.CAMUNDA_ENABLED !== 'false') {
  try {
    camunda = new Camunda8({
      ZEEBE_GRPC_ADDRESS: CAMUNDA_CONFIG.ZEEBE_GRPC_ADDRESS,
      ZEEBE_REST_ADDRESS: CAMUNDA_CONFIG.ZEEBE_REST_ADDRESS,
      CAMUNDA_AUTH_STRATEGY: CAMUNDA_CONFIG.CAMUNDA_AUTH_STRATEGY,
      CAMUNDA_OAUTH_DISABLED: true
    });
  } catch (error) {
    console.log('Failed to initialize Camunda client:', error.message);
    camunda = null;
  }
}

// Process definition key
const PROCESS_DEFINITION_KEY = 'Process_1r2vmgs';
const isCamundaWorkflowEnabled = () => (
  process.env.NODE_ENV !== 'test' && process.env.CAMUNDA_ENABLED !== 'false'
);

/**
 * Start a process instance for a new request
 */
const startProcessInstance = async (requestId, requestData) => {
  if (!camunda) {
    console.log('Camunda not available, skipping process instance start');
    return { success: false, error: 'Camunda client not initialized' };
  }

  try {
    const zeebeClient = camunda.getZeebeGrpcApiClient();

    const processVariables = {
      requestId: requestData.id ?? requestId,
      title: requestData.title,
      description: requestData.description,
      category: requestData.category,
      priority: requestData.priority,
      userId: requestData.user_id,
      department: requestData.department,
      region: requestData.region
    };

    const result = await zeebeClient.createProcessInstance({
      bpmnProcessId: PROCESS_DEFINITION_KEY,
      variables: processVariables
    });
    
    // Store process instance ID in database
    db.prepare(`
      UPDATE requests 
      SET camunda_process_instance_id = ? 
      WHERE id = ?
    `).run(result.processInstanceKey, requestId);
    
    console.log(`Process instance started for request ${requestId}: ${result.processInstanceKey}`);
    
    // Emit event
    eventBus.emit(EventTypes.WORKFLOW_STARTED, {
      requestId,
      processInstanceId: result.processInstanceKey,
      processDefinitionKey: PROCESS_DEFINITION_KEY
    });
    
    return { success: true, processInstanceId: result.processInstanceKey };
  } catch (error) {
    console.error('Failed to start process instance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user tasks for a specific user
 */
const getUserTasks = async (userId) => {
  if (!camunda) {
    return [];
  }

  try {
    const orchestrationClient = camunda.getOrchestrationClusterApiClient();
    const response = await orchestrationClient.searchUserTasks({
      filter: {
        assignee: userId.toString(),
        state: 'CREATED'
      }
    });

    return (response.items || []).map(task => {
      const request = db.prepare('SELECT id FROM requests WHERE camunda_process_instance_id = ?')
        .get(task.processInstanceKey);
      return {
        ...task,
        variables: { requestId: { value: request?.id } }
      };
    });
  } catch (error) {
    console.error('Failed to get user tasks:', error);
    return [];
  }
};

/**
 * Complete a user task with variables
 */
const completeUserTask = async (taskId, variables = {}) => {
  if (!camunda) {
    return { success: false, error: 'Camunda client not initialized' };
  }

  try {
    const orchestrationClient = camunda.getOrchestrationClusterApiClient();
    await orchestrationClient.completeUserTask({
      userTaskKey: taskId,
      variables
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to complete user task:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get task by request ID
 */
const getTaskByRequestId = async (requestId) => {
  if (!camunda) {
    return null;
  }

  try {
    const orchestrationClient = camunda.getOrchestrationClusterApiClient();
    const request = db.prepare('SELECT camunda_process_instance_id FROM requests WHERE id = ?').get(requestId);
    if (!request?.camunda_process_instance_id) {
      return null;
    }

    const response = await orchestrationClient.searchUserTasks({
      filter: {
        processInstanceKey: request.camunda_process_instance_id,
        state: 'CREATED'
      }
    });

    const task = response.items?.[0];
    return task ? { ...task, variables: { requestId: { value: Number(requestId) } } } : null;
  } catch (error) {
    console.error('Failed to get task by request ID:', error);
    return null;
  }
};

/**
 * Get process instance status
 */
const getProcessInstanceStatus = async (processInstanceId) => {
  if (!camunda) {
    return null;
  }

  try {
    const zeebeClient = camunda.getZeebeGrpcApiClient();
    const instance = await zeebeClient.topology();
    
    return instance;
  } catch (error) {
    console.error('Failed to get process instance status:', error);
    return null;
  }
};

module.exports = {
  startProcessInstance,
  getUserTasks,
  completeUserTask,
  getTaskByRequestId,
  getProcessInstanceStatus,
  isCamundaWorkflowEnabled,
  PROCESS_DEFINITION_KEY
};
