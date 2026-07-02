import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = '',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    !children && Icon && 'btn-icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="btn-spinner" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : 18} />
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
}
