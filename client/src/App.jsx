import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import Layout from './components/Layout/Layout';

// استيراد الصفحات
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import NewOrder from './pages/Orders/NewOrder';
import OrdersList from './pages/Orders/OrdersList';
import OrderDetails from './pages/Orders/OrderDetails';
import ItemTracking from './pages/Items/ItemTracking';
import Customers from './pages/Customers/Customers';
import Services from './pages/Services/Services';
import Finance from './pages/Finance/Finance';
import Users from './pages/Users/Users';
import CustomerPortal from './pages/CustomerPortal/CustomerPortal';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* مسار بوابة العميل العامة - لا تحتاج لمصادقة */}
          <Route path="/portal" element={<CustomerPortal />} />

          {/* مسار تسجيل الدخول */}
          <Route path="/login" element={<Login />} />

          {/* المسارات المحمية تحت تصميم لوحة التحكم */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* الصفحة الرئيسية للوحة التحكم */}
            <Route index element={<Dashboard />} />

            {/* مسارات الطلبات */}
            <Route path="orders" element={<OrdersList />} />
            <Route path="orders/new" element={<NewOrder />} />
            <Route path="orders/:id" element={<OrderDetails />} />

            {/* تتبع القطع وعملية التشغيل */}
            <Route path="tracking" element={<ItemTracking />} />

            {/* إدارة العملاء والخدمات والمالية */}
            <Route path="customers" element={<Customers />} />
            <Route path="services" element={<Services />} />
            <Route path="finance" element={<Finance />} />

            {/* إدارة المستخدمين (للمدير فقط) */}
            <Route
              path="users"
              element={
                <ProtectedRoute adminOnly>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* إعادة التوجيه الافتراضية */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
