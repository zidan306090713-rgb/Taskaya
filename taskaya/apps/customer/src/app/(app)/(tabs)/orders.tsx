import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { tr } from '@/i18n';
import { colors, fonts } from '@/theme';

export default function Orders() {
  return (
    <Screen title={tr('طلباتي', 'My Orders')}>
      <Text style={styles.empty}>{tr('لا توجد طلبات بعد', 'No orders yet')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: 48 },
});
