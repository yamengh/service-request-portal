/**
 * Mock External API Integration Service
 * Simulates integration with external systems
 */

class ExternalApiService {
  constructor() {
    this.mockResponses = {
      erp: {
        sync: { success: true, erpId: 'ERP-' + Date.now(), message: 'Synced to ERP system' },
        status: { status: 'online', lastSync: new Date().toISOString() }
      },
      ticketing: {
        create: { success: true, ticketId: 'TKT-' + Date.now(), status: 'open' },
        update: { success: true, message: 'Ticket updated' }
      },
      analytics: {
        push: { success: true, eventsProcessed: 1, message: 'Analytics data pushed' }
      }
    };
    
    this.requestLog = [];
  }

  /**
   * Mock ERP system sync
   */
  async syncToERP(requestData) {
    this.logRequest('ERP_SYNC', requestData);
    
    // Simulate network delay
    await this.simulateDelay(100, 300);
    
    const response = {
      ...this.mockResponses.erp.sync,
      requestData: {
        requestId: requestData.id,
        title: requestData.title,
        category: requestData.category,
        status: requestData.status,
        userId: requestData.user_id
      }
    };
    
    return response;
  }

  /**
   * Mock ERP system status check
   */
  async getERPStatus() {
    this.logRequest('ERP_STATUS', {});
    await this.simulateDelay(50, 150);
    return this.mockResponses.erp.status;
  }

  /**
   * Mock ticketing system integration
   */
  async createTicket(requestData) {
    this.logRequest('TICKET_CREATE', requestData);
    
    await this.simulateDelay(150, 400);
    
    const response = {
      ...this.mockResponses.ticketing.create,
      ticketData: {
        title: `Service Request #${requestData.id}: ${requestData.title}`,
        description: requestData.description,
        priority: requestData.priority,
        assignee: requestData.reviewer_id || 'unassigned',
        createdBy: requestData.user_id
      }
    };
    
    return response;
  }

  /**
   * Mock ticketing system update
   */
  async updateTicket(ticketId, updateData) {
    this.logRequest('TICKET_UPDATE', { ticketId, updateData });
    
    await this.simulateDelay(100, 250);
    
    return {
      ...this.mockResponses.ticketing.update,
      ticketId,
      updateData
    };
  }

  /**
   * Mock analytics service integration
   */
  async pushAnalytics(eventData) {
    this.logRequest('ANALYTICS_PUSH', eventData);
    
    await this.simulateDelay(50, 200);
    
    return {
      ...this.mockResponses.analytics.push,
      eventType: eventData.type,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock system health check
   */
  async healthCheck() {
    await this.simulateDelay(50, 100);
    
    return {
      status: 'healthy',
      systems: {
        erp: 'online',
        ticketing: 'online',
        analytics: 'online'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simulate network delay
   */
  simulateDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Log requests for debugging
   */
  logRequest(endpoint, data) {
    this.requestLog.push({
      endpoint,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 requests
    if (this.requestLog.length > 100) {
      this.requestLog.shift();
    }
  }

  /**
   * Get request log
   */
  getRequestLog(limit = 20) {
    return this.requestLog.slice(-limit);
  }

  /**
   * Clear request log
   */
  clearRequestLog() {
    this.requestLog = [];
  }
}

// Create singleton instance
const externalApiService = new ExternalApiService();

module.exports = externalApiService;