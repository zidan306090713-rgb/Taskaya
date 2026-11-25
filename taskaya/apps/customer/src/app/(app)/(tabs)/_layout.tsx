import { Redirect } from 'expo-router';
import { AppTabs } from '@/components/AppTabs';
import { tr } from '@/i18n';
import { isProvider } from '@/lib/provider';
import { useAuth } from '@/providers/AuthProvider';

// تابات العميل — ولو اللي داخل مقدم خدمة بيتحوّل لشاشاته
export default function TabsLayout() {
  const { session } = useAuth();
  if (isProvider(session)) return <Redirect href={'/pro' as never} />;
  return (
    <AppTabs
      tabs={[
        { name: 'index', title: tr('الرئيسية', 'Home'), icon: 'home' },
        { name: 'orders', title: tr('طلباتي', 'My Orders'), icon: 'receipt' },
        { name: 'profile', title: tr('حسابي', 'Profile'), icon: 'person' },
      ]}
    />
  );
}
