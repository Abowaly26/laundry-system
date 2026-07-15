import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  laundryName: 'المغسلة الذكية',
  laundryPhone: '0501234567',
  laundryAddress: 'الرياض، المملكة العربية السعودية',
  taxNumber: '300012345600003',
  vatPercent: 15,
  currency: 'ر.س',
  defaultCountryCode: '966',
  whatsappTemplate: `مرحباً {customer_name}،
تم تسجيل طلبك رقم #{order_id} بنجاح.

تفاصيل الفاتورة:
- عدد القطع: {items_count}
- إجمالي الفاتورة: {total_amount} {currency}
- المتبقي للدفع: {remaining_amount} {currency}
- موعد التسليم: {delivery_date}

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

  // Keep state in sync if laundry_settings is cleared (e.g. on logout)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('laundry_settings');
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also periodically check or use custom event / interval because storage event only fires for other windows
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const getSettingsWithUserCurrency = () => {
    // Determine current language from localStorage or global i18next state
    let currentLang = 'ar';
    try {
      const savedLang = localStorage.getItem('i18nextLng');
      if (savedLang) {
        currentLang = savedLang.startsWith('en') ? 'en' : 'ar';
      }
    } catch (e) {}

    const englishWhatsappTemplate = `Hello {customer_name},
Your order #{order_id} has been registered successfully.

Invoice Details:
- Items Count: {items_count}
- Total Amount: {total_amount} {currency}
- Remaining Amount: {remaining_amount} {currency}
- Delivery Date: {delivery_date}

You can track your laundry status directly via this tracking link:
{tracking_link}

Thank you for choosing us! ✨`;

    let resolvedSettings = { ...settings };
    
    // Auto translate default template only if user hasn't customized it, or if they are just viewing standard defaults in English
    if (currentLang === 'en' && settings.whatsappTemplate === DEFAULT_SETTINGS.whatsappTemplate) {
      resolvedSettings.whatsappTemplate = englishWhatsappTemplate;
    }

    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.laundry_name) {
          resolvedSettings.laundryName = user.laundry_name;
        }
        if (user.laundry_phone) {
          resolvedSettings.laundryPhone = user.laundry_phone;
        }
        if (user.laundry_address) {
          resolvedSettings.laundryAddress = user.laundry_address;
        }
        if (user.laundry_currency) {
          resolvedSettings.currency = user.laundry_currency;
        }
        if (user.laundry_tax_number !== undefined && user.laundry_tax_number !== null) {
          resolvedSettings.taxNumber = user.laundry_tax_number;
        }
        if (user.laundry_vat_percent !== undefined && user.laundry_vat_percent !== null) {
          resolvedSettings.vatPercent = parseFloat(user.laundry_vat_percent);
        }
        if (user.laundry_country_code) {
          resolvedSettings.defaultCountryCode = user.laundry_country_code;
        }
      }
    } catch (e) {
      console.error('Failed to resolve dynamic laundry settings', e);
    }
    return resolvedSettings;
  };

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('laundry_settings', JSON.stringify(updated));
  };

  return (
    <SettingsContext.Provider value={{ settings: getSettingsWithUserCurrency(), updateSettings, defaults: DEFAULT_SETTINGS }}>
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
