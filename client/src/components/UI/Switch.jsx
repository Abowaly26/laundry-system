import './Switch.css';

export default function Switch({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        disabled={disabled}
      />
      <span className="slider round"></span>
    </label>
  );
}
