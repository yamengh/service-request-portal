/**
 * Event Bus Service
 * Simple in-memory event simulation for decoupling components
 */

class EventBus {
  constructor() {
    this.listeners = {};
    this.eventHistory = [];
  }

  /**
   * Subscribe to an event type
   */
  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  /**
   * Unsubscribe from an event type
   */
  off(eventType, callback) {
    if (!this.listeners[eventType]) return;
    
    this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
  }

  /**
   * Publish an event
   */
  emit(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      id: this.generateEventId()
    };

    // Store in history
    this.eventHistory.push(event);

    // Notify listeners
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }

    return event;
  }

  /**
   * Get event history
   */
  getHistory(eventType = null, limit = 100) {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }

    return events.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Define standard event types
const EventTypes = {
  REQUEST_CREATED: 'request.created',
  REQUEST_UPDATED: 'request.updated',
  REQUEST_DELETED: 'request.deleted',
  REQUEST_CLASSIFIED: 'request.classified',
  REQUEST_APPROVED: 'request.approved',
  REQUEST_REJECTED: 'request.rejected',
  REQUEST_ASSIGNED: 'request.assigned',
  
  WORKFLOW_TRANSITION: 'workflow.transition',
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  
  SERVICE_SUBSCRIBED: 'service.subscribed',
  SERVICE_UNSUBSCRIBED: 'service.unsubscribed',
  
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  
  AUDIT_LOG_CREATED: 'audit.log.created'
};

module.exports = {
  eventBus,
  EventTypes
};