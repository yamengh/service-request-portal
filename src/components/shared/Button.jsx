import './Button.css';

const Button = ({ variant = 'primary', children, disabled = false, onClick, type = 'button' }) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
