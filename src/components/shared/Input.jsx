import './Input.css';

const Input = ({ type = 'text', label, value, onChange, error, options, name, required = false }) => {
  const inputId = `input-${name}`;

  if (type === 'textarea') {
    return (
      <div className="input-group">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="input-required">*</span>}
          </label>
        )}
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          className={`input-field input-textarea ${error ? 'input-error' : ''}`}
          rows={4}
          required={required}
        />
        {error && <span className="input-error-message">{error}</span>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="input-group">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="input-required">*</span>}
          </label>
        )}
        <select
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          className={`input-field ${error ? 'input-error' : ''}`}
          required={required}
        >
          <option value="">Select {label?.toLowerCase()}</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error && <span className="input-error-message">{error}</span>}
      </div>
    );
  }

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`input-field ${error ? 'input-error' : ''}`}
        required={required}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
