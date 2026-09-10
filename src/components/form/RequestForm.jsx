import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../shared/Input';
import Button from '../shared/Button';
import { validateForm } from '../../utils/validation';
import { useRequests } from '../../context/RequestsContext';
import './RequestForm.css';

const RequestForm = () => {
  const navigate = useNavigate();
  const { addRequest } = useRequests();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: ''
  });
  const [errors, setErrors] = useState({
    title: null,
    description: null,
    category: null,
    priority: null
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const categories = ['Hardware', 'Software', 'Network', 'Access', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    setErrors(prev => ({ ...prev, [name]: null }));
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { errors: validationErrors, isValid } = validateForm(formData);
    setErrors(validationErrors);
    
    if (isValid) {
      setIsSubmitting(true);
      setSubmitError(null);
      
      const result = await addRequest(formData);
      
      if (result.success) {
        setIsSubmitted(true);
        
        // Show success message then redirect
        setTimeout(() => {
          setIsSubmitted(false);
          setFormData({
            title: '',
            description: '',
            category: '',
            priority: ''
          });
          navigate('/requests');
        }, 2000);
      } else {
        setSubmitError(result.error);
      }
      
      setIsSubmitting(false);
    }
  };

  const { isValid } = validateForm(formData);

  if (isSubmitted) {
    return (
      <div className="request-form-success">
        <div className="success-icon">✓</div>
        <h2 className="success-title">Request Submitted Successfully</h2>
        <p className="success-message">Your service request has been submitted and is being processed.</p>
        <p className="success-redirect">Redirecting to My Requests...</p>
      </div>
    );
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      {submitError && (
        <div className="request-form-error">
          {submitError}
        </div>
      )}
      
      <Input
        type="text"
        name="title"
        label="Title"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        required
      />
      
      <Input
        type="textarea"
        name="description"
        label="Description"
        value={formData.description}
        onChange={handleChange}
        error={errors.description}
        required
      />
      
      <Input
        type="select"
        name="category"
        label="Category"
        value={formData.category}
        onChange={handleChange}
        error={errors.category}
        options={categories}
        required
      />
      
      <Input
        type="select"
        name="priority"
        label="Priority"
        value={formData.priority}
        onChange={handleChange}
        error={errors.priority}
        options={priorities}
        required
      />
      
      <div className="request-form-actions">
        <Button type="submit" variant="primary" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Button>
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default RequestForm;
