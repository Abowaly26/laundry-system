import './LoadingSpinner.css';

export default function LoadingSpinner({ size = '', text = 'جاري التحميل...' }) {
  return (
    <div className="loading-spinner-container">
      <div className={`spinner ${size ? `spinner-${size}` : ''}`} />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
