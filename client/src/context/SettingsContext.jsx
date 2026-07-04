import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  laundryName: 'المغسلة الذكية',
  laundryPhone: '0501234567',
  laundryAddress: 'الرياض، المملكة العربية السعودية',
  taxNumber: '300012345600003',
  vatPercent: 15,
  currency: 'ر.س',
  whatsappTemplate: `مرحباً {customer_name}،
تم تسجيل طلبك رقم #{order_id} بنجاح.

تفاصيل الفاتورة:
- عدد القطع: {items_count}
- إجمالي الفاتورة: {total_amount} {currency}
- المتبقي للدفع: {remaining_amount} {currency}
- موعد التسليم المتوقع: {delivery_date}

يمكنك تتبع حالة غسيل وكي ملابسك مباشرة من رابط التتبع الخاص بك:
{tracking_link}

شكراً لثقتكم بنا! ✨`
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('laundry_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('laundry_settings', JSON.stringify(updated));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, defaults: DEFAULT_SETTINGS }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
