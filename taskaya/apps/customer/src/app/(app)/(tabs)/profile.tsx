import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { t, tr } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme';

export default function Profile() {
  const { session } = useAuth();
  return (
    <Screen title={tr('حسابي', 'Profile')}>
      <GlassCard style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.primaryLight} />
        </View>
        <Text style={styles.email}>{session?.user.email ?? ''}</Text>
      </GlassCard>
      <View style={{ height: spacing.lg }} />
      <Button title={t('logout')} variant="outline" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  email: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
