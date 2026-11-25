import { Redirect } from 'expo-router';
import { AppTabs } from '@/components/AppTabs';
import { tr } from '@/i18n';
import { isProvider } from '@/lib/provider';
import { useAuth } from '@/providers/AuthProvider';

// تابات مقدم الخدمة — والعميل مايقدرش يدخلها
export default function ProLayout() {
  const { session } = useAuth();
  if (session && !isProvider(session)) return <Redirect href="/" />;
  return (
    <AppTabs
      base="/pro"
      tabs={[
        { name: 'index', title: tr('الرئيسية', 'Home'), icon: 'home' },
        { name: 'requests', title: tr('الطلبات', 'Requests'), icon: 'clipboard' },
        { name: 'wallet', title: tr('المحفظة', 'Wallet'), icon: 'wallet' },
        { name: 'account', title: tr('حسابي', 'Profile'), icon: 'person' },
      ]}
    />
  );
}
