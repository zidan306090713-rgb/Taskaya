import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { t, tr } from '@/i18n';
import { toLocalDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, spacing } from '@/theme';

export default function Profile() {
  const { session } = useAuth();
  const [info, setInfo] = useState<{ full_name: string | null; phone: string | null } | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setInfo(data));
  }, [session]);

  const name = info?.full_name || session?.user.user_metadata?.full_name || '';
  const rawPhone = info?.phone || session?.user.phone || '';
  const secondary = rawPhone ? toLocalDisplay(rawPhone) : session?.user.email ?? '';

  return (
    <Screen title={tr('حسابي', 'Profile')}>
      <GlassCard navy style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#9CC7FF" />
        </View>
        <View style={{ flex: 1 }}>
          {name ? <Text style={styles.name} numberOfLines={1}>{name}</Text> : null}
          {secondary ? <Text style={name ? styles.phone : styles.name} numberOfLines={1}>{secondary}</Text> : null}
        </View>
      </GlassCard>
      <View style={{ height: spacing.lg }} />
      <Button title={t('logout')} variant="outline" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(124,196,255,0.16)', borderWidth: 1.5, borderColor: 'rgba(124,196,255,0.45)', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 17, color: '#FFFFFF' },
  phone: { fontFamily: fonts.regular, fontSize: 14, color: '#B7CDEE', marginTop: 2 },
});
