import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Input from '../shared/Input';
import './LoginForm.css';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Card>
          <div className="login-form">
            <h1 className="login-title">Service Request Portal</h1>
            <p className="login-subtitle">Sign in to continue</p>
            
            {error && <div className="login-error">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
              
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              
              <Button type="submit" variant="primary" className="login-button">
                Sign In
              </Button>
            </form>
            
            <div className="login-demo">
              <p className="login-demo-text">Demo credentials:</p>
              <p className="login-demo-credentials">User: user / user123</p>
              <p className="login-demo-credentials">Admin: admin / admin123</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
