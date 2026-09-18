import { useState, useEffect } from 'react';
import { serviceService } from '../services/serviceService';
import { useAuth } from '../context/AuthContext';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import './ServiceCatalog.css';

const ServiceCatalog = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesData, subscriptionsData] = await Promise.all([
        serviceService.getAllServices(),
        serviceService.getMySubscriptions()
      ]);
      setServices(servicesData);
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (serviceId) => {
    try {
      await serviceService.subscribeToService(serviceId);
      await loadData(); // Reload to update subscription status
    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to subscribe to service');
    }
  };

  const handleUnsubscribe = async (serviceId) => {
    try {
      await serviceService.unsubscribeFromService(serviceId);
      await loadData(); // Reload to update subscription status
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      alert('Failed to unsubscribe from service');
    }
  };

  const isSubscribed = (serviceId) => {
    return subscriptions.some(sub => sub.id === serviceId);
  };

  const filteredServices = services.filter(service => {
    if (filter === 'all') return true;
    if (filter === 'subscribed') return isSubscribed(service.id);
    if (filter === 'unsubscribed') return !isSubscribed(service.id);
    return service.category === filter;
  });

  const categories = [...new Set(services.map(s => s.category))];

  if (loading) {
    return <div className="loading">Loading services...</div>;
  }

  return (
    <div className="service-catalog">
      <div className="catalog-header">
        <h1>Service Catalog</h1>
        <p>Browse and subscribe to available services</p>
      </div>

      <div className="catalog-filters">
        <Button 
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          All Services
        </Button>
        <Button 
          variant={filter === 'subscribed' ? 'primary' : 'secondary'}
          onClick={() => setFilter('subscribed')}
        >
          My Subscriptions
        </Button>
        <Button 
          variant={filter === 'unsubscribed' ? 'primary' : 'secondary'}
          onClick={() => setFilter('unsubscribed')}
        >
          Available
        </Button>
        
        {categories.map(category => (
          <Button
            key={category}
            variant={filter === category ? 'primary' : 'secondary'}
            onClick={() => setFilter(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="services-grid">
        {filteredServices.map(service => (
          <Card key={service.id} className="service-card">
            <div className="service-header">
              <h3>{service.name}</h3>
              <Badge variant="info">{service.category}</Badge>
            </div>
            
            <p className="service-description">{service.description}</p>
            
            <div className="service-meta">
              <span className="service-department">
                {service.department || 'General'}
              </span>
              {service.requires_approval ? (
                <Badge variant="warning">Requires Approval</Badge>
              ) : (
                <Badge variant="success">Auto-Approved</Badge>
              )}
            </div>

            <div className="service-actions">
              {isSubscribed(service.id) ? (
                <Button 
                  variant="danger" 
                  onClick={() => handleUnsubscribe(service.id)}
                >
                  Unsubscribe
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={() => handleSubscribe(service.id)}
                >
                  Subscribe
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="no-services">
          <p>No services found for the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalog;