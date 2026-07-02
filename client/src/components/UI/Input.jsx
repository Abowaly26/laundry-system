export default function Input({
  label,
  error,
  id,
  className = '',
  type = 'text',
  ...props
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`form-input ${error ? 'error' : ''}`}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
