import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { fonts, useThemedStyles, type ThemeColors } from '@/theme';

export function AccountRequired({
  title = 'Seguí tu impacto',
  embedded = false,
  back,
  onBack,
}: Readonly<{
  title?: string;
  embedded?: boolean;
  back?: Href;
  onBack?: () => void;
}>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      {!embedded && <ScreenHeader title={title} back={back} onBack={onBack} />}
      <View style={styles.body}>
        <View style={styles.content}>
          {embedded && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.description}>
            Creá tu cuenta para registrar tus entregas, sumar puntos y seguir tu impacto.
          </Text>
          <ActionButton title="Crear cuenta" onPress={() => router.push('/register')} />
          <ActionButton title="Iniciar sesión" secondary onPress={() => router.push('/login')} />
        </View>
      </View>
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, justifyContent: 'center', padding: 24 },
    content: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
    title: { fontFamily: fonts.bold, fontSize: 26, color: colors.primary },
    description: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  });
