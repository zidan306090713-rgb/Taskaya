import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { t, tr } from '@/i18n';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  return (
    <Screen title={tr('حسابي', 'Profile')}>
      <Button title={t('logout')} variant="outline" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
