import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, RefreshCw, BarChart2, Zap } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './WorkloadDashboard.css';

export default function WorkloadDashboard() {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [statusStats, setStatusStats] = useState(null);
  const [timelineOrders, setTimelineOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkloadData = async (dateVal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statusRes, timelineRes] = await Promise.all([
        ordersAPI.getWorkloadStatus(),
        ordersAPI.getWorkloadTimeline(dateVal)
      ]);

      if (statusRes.success) {
        setStatusStats(statusRes.data);
      }
      if (timelineRes.success) {
        setTimelineOrders(timelineRes.data);
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ أثناء تحميل بيانات ضغط العمل والخط الزمني', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkloadData(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleRefresh = () => {
    fetchWorkloadData(selectedDate, true);
  };

  // تقسيم الطلبات إلى "متأخرة" و"نشطة لليوم"
  const overdueOrders = timelineOrders.filter(order => {
    const isOverdue = new Date(order.expected_delivery_at) < new Date() && order.order_status !== 'ready';
    return isOverdue;
  });

  const activeDayOrders = timelineOrders.filter(order => {
    const isOverdue = new Date(order.expected_delivery_at) < new Date() && order.order_status !== 'ready';
    return !isOverdue;
  });

  // حساب النسبة المئوية للمغسلة ككل
  const getLoadPercentage = () => {
    if (!statusStats) return 0;
    const maxCapacityItems = 50; // افتراض أقصى سعة للمغسلة 50 قطعة بالانتظار
    const percentage = (statusStats.total_active_items / maxCapacityItems) * 100;
    return Math.min(Math.round(percentage), 100);
  };

  const getLoadColor = (level) => {
    if (level === 'high') return '#ef4444'; // Red
    if (level === 'medium') return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  const getLoadLabelAr = (level) => {
    if (level === 'high') return 'ضغط مرتفع (تأخير إضافي)';
    if (level === 'medium') return 'ضغط متوسط (تأخير طفيف)';
    return 'ضغط منخفض (تسليم سريع)';
  };

  // اقتراح المهمة التالية بناءً على أقدم الطلبات غير المكتملة
  const getNextRecommendedTasks = () => {
    const incompleteOrders = [...timelineOrders]
      .filter(o => o.order_status !== 'ready' && o.order_status !== 'delivered')
      .sort((a, b) => new Date(a.expected_delivery_at) - new Date(b.expected_delivery_at));

    if (incompleteOrders.length === 0) {
      return [];
    }

    return incompleteOrders.slice(0, 3).map(order => {
      const overdue = new Date(order.expected_delivery_at) < new Date();
      return {
        id: order.id,
        customer_name: order.customer_name,
        due: new Date(order.expected_delivery_at).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        total_items: order.total_items,
        ready_items: order.ready_items,
        overdue
      };
    });
  };

  const recommendedTasks = getNextRecommendedTasks();

  return (
    <div className="page workload-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">جدول ضغط العمل والجدولة اليومية</h1>
          <p className="page-subtitle">مراقبة سعة العمل، تتبع خط التوقيت اليومي لإنهاء الطلبات وتأكيد مواعيد التسليم</p>
        </div>
        <div className="flex items-center gap-md header-actions">
          <div className="date-picker-wrapper">
            <Calendar size={18} className="date-icon" />
            <input 
              type="date" 
              className="form-input date-picker-input" 
              value={selectedDate} 
              onChange={handleDateChange} 
            />
          </div>
          <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
          <LoadingSpinner />
        </div>
      ) : (
        <div className="workload-grid">
          {/* العمود الأيمن: مؤشرات ضغط العمل والمهمة التالية */}
          <div className="workload-sidebar">
            {/* بطاقة ضغط العمل */}
            <Card title="مؤشر سعة تشغيل المغسلة" className="mb-md">
              {statusStats && (
                <div className="workload-capacity-box">
                  <div className="capacity-gauge-wrapper">
                    <div 
                      className="capacity-fill" 
                      style={{ 
                        width: `${getLoadPercentage()}%`,
                        backgroundColor: getLoadColor(statusStats.workload_level)
                      }}
                    ></div>
                    <span className="capacity-text">{getLoadPercentage()}% إشغال</span>
                  </div>

                  <div className="capacity-meta mt-md">
                    <div className="status-badge-lg" style={{ color: getLoadColor(statusStats.workload_level) }}>
                      <BarChart2 size={20} />
                      <strong>{getLoadLabelAr(statusStats.workload_level)}</strong>
                    </div>
                    <p className="text-secondary mt-sm">
                      إجمالي القطع النشطة قيد المعالجة حالياً: <strong>{statusStats.total_active_items} قطعة</strong>
                    </p>
                    <p className="text-secondary">
                      معدل التأخير المتوقع المقترح إضافته: <strong>+{statusStats.suggested_delay_hours} ساعة</strong>
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* تفاصيل مراحل الغسيل */}
            <Card title="حالة الغسيل الحالية بالتفصيل" className="mb-md">
              {statusStats && (
                <div className="queue-status-list">
                  <div className="queue-status-item">
                    <span className="status-label text-secondary">بانتظار الغسيل (مستلمة)</span>
                    <span className="status-count badge-blue">{statusStats.received} قطع</span>
                  </div>
                  <div className="queue-status-item">
                    <span className="status-label text-secondary">تحت الغسيل</span>
                    <span className="status-count badge-indigo">{statusStats.washing} قطع</span>
                  </div>
                  <div className="queue-status-item">
                    <span className="status-label text-secondary">قيد التجفيف</span>
                    <span className="status-count badge-warning">{statusStats.drying} قطع</span>
                  </div>
                  <div className="queue-status-item">
                    <span className="status-label text-secondary">قيد الكي</span>
                    <span className="status-count badge-purple">{statusStats.ironing} قطع</span>
                  </div>
                </div>
              )}
            </Card>

            {/* الخطوة التالية المقترحة */}
            <Card title="مهمات مقترحة لترتيب العمل">
              <div className="recommended-tasks-list">
                {recommendedTasks.length > 0 ? (
                  recommendedTasks.map((task, idx) => (
                    <div key={task.id} className={`recommended-task-item ${task.overdue ? 'overdue-task' : ''}`}>
                      <div className="task-number">
                        <Zap size={14} />
                      </div>
                      <div className="task-details">
                        <strong>طلب رقم #{task.id} - للعميل {task.customer_name}</strong>
                        <div className="task-meta text-secondary mt-xs">
                          <span>موعد التسليم: <strong className={task.overdue ? 'text-error' : ''}>{task.due}</strong></span>
                          <span> | جاهز: {task.ready_items}/{task.total_items} قطع</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-tasks text-success text-center py-md">
                    <CheckCircle size={32} style={{ marginBottom: '8px' }} />
                    <p>المغسلة فارغة تماماً ولا توجد مهام معالجة بالانتظار!</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* العمود الأيسر: جدول خط التوقيت اليومي للطلبات */}
          <div className="workload-main">
            {/* الطلبات المتأخرة أولاً */}
            {overdueOrders.length > 0 && (
              <Card title="طلبات متأخرة يجب إنجازها فوراً ⚠️" className="mb-md overdue-card-wrapper">
                <div className="timeline-orders-list">
                  {overdueOrders.map(order => (
                    <div key={order.id} className="timeline-order-card overdue-order-row">
                      <div className="order-time-col">
                        <Clock size={16} className="text-error" />
                        <span className="time-val text-error">متأخر!</span>
                      </div>
                      <div className="order-details-col">
                        <h3>طلب #{order.id} - {order.customer_name}</h3>
                        <p className="text-secondary">{order.customer_phone}</p>
                      </div>
                      <div className="order-progress-col">
                        <div className="progress-labels">
                          <span>تجهيز القطع</span>
                          <strong>{order.ready_items} من {order.total_items}</strong>
                        </div>
                        <div className="progress-bar-bg">
                          <div 
                            className="progress-bar-fill progress-error" 
                            style={{ width: `${(order.ready_items / (order.total_items || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="order-status-col">
                        <span className="badge-error">متأخر</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* خط التوقيت لليوم المحدد */}
            <Card title={`خط توقيت التسليمات ليوم: ${selectedDate}`}>
              {activeDayOrders.length > 0 ? (
                <div className="timeline-orders-list">
                  {activeDayOrders.map(order => {
                    const dueTime = new Date(order.expected_delivery_at).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const progressPercent = Math.round((order.ready_items / (order.total_items || 1)) * 100);

                    return (
                      <div key={order.id} className="timeline-order-card">
                        <div className="order-time-col">
                          <Clock size={16} className="text-secondary" />
                          <span className="time-val font-bold">{dueTime}</span>
                        </div>
                        <div className="order-details-col">
                          <h3>طلب #{order.id} - {order.customer_name}</h3>
                          <p className="text-secondary">{order.customer_phone}</p>
                        </div>
                        <div className="order-progress-col">
                          <div className="progress-labels">
                            <span>تجهيز القطع</span>
                            <strong>{order.ready_items} من {order.total_items} ({progressPercent}%)</strong>
                          </div>
                          <div className="progress-bar-bg">
                            <div 
                              className={`progress-bar-fill ${progressPercent === 100 ? 'progress-success' : 'progress-primary'}`} 
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="order-status-col">
                          {progressPercent === 100 ? (
                            <span className="badge-success">جاهز</span>
                          ) : (
                            <span className="badge-warning">قيد العمل</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-timeline-state py-lg text-center text-secondary">
                  <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                  <h3>لا توجد طلبات تسليم مجدولة لهذا اليوم</h3>
                  <p>يمكنك تغيير اليوم من الأعلى لمشاهدة المخططات وجدول العمل للأيام الأخرى.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
