import { Component } from 'react';
import Button from './UI/Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="error-boundary-fallback">
            <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>حدث خطأ غير متوقع</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              حدث خطأ أثناء عرض الصفحة. يرجى المحاولة مرة أخرى.
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
