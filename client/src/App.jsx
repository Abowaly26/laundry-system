import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
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
import Settings from './pages/Settings/Settings';
import CustomerPortal from './pages/CustomerPortal/CustomerPortal';
import Laundries from './pages/Laundries/Laundries';

function App() {
  return (
    <Router>
      <SettingsProvider>
        <ToastProvider>
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
              <Route 
                path="orders/new" 
                element={
                  <ProtectedRoute noWorker>
                    <NewOrder />
                  </ProtectedRoute>
                } 
              />
              <Route path="orders/:id" element={<OrderDetails />} />

              {/* تتبع القطع وعملية التشغيل */}
              <Route path="tracking" element={<ItemTracking />} />

              {/* إدارة العملاء والخدمات والمالية */}
              <Route 
                path="customers" 
                element={
                  <ProtectedRoute noWorker>
                    <Customers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="services" 
                element={
                  <ProtectedRoute adminOnly>
                    <Services />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="finance" 
                element={
                  <ProtectedRoute adminOnly>
                    <Finance />
                  </ProtectedRoute>
                } 
              />

              {/* إدارة المستخدمين والإعدادات (للمدير فقط) */}
              <Route
                path="users"
                element={
                  <ProtectedRoute adminOnly>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute adminOnly>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* إدارة المغاسل (صاحب النظام فقط) */}
              <Route
                path="laundries"
                element={
                  <ProtectedRoute superOwnerOnly>
                    <Laundries />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* إعادة التوجيه الافتراضية */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AuthProvider>
        </ToastProvider>
      </SettingsProvider>
    </Router>
  );
}

export default App;
