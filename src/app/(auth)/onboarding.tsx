import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import { brand } from '@/config/brand';

const slides = [
  {
    title: 'Dale una segunda vida a tu tecnología',
    description:
      'Celulares, notebooks, cables y otros aparatos en desuso pueden convertirse en nuevos recursos en lugar de terminar contaminando.',
    image: require('../../../assets/images/onboarding/step-1-devices.jpg'),
    imageAlt: 'Una persona junta un celular y una notebook en desuso para reciclarlos',
  },
  {
    title: 'Encontrá el punto verde más cercano',
    description:
      'Buscá por el dispositivo que querés entregar y mirá qué categorías acepta cada punto, su dirección, horarios y distancia hasta ahí.',
    image: require('../../../assets/images/onboarding/step-2-map.jpg'),
    imageAlt: 'Una persona mirando el mapa de puntos verdes en su celular por la calle',
  },
  {
    title: 'Sumá puntos y canjealos por premios',
    description:
      'Creá tu cuenta para registrar tus entregas, llevar tu saldo global y canjear premios de los comercios aliados.',
    image: require('../../../assets/images/onboarding/step-3-rewards.jpg'),
    imageAlt: 'Una persona canjeando un código QR por un premio en un comercio aliado',
  },
] as const;
export default function OnboardingScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { onboardingComplete, continueAsGuest } = useAuth();
  const [index, setIndex] = useState(0);
  const [pendingAction, setPendingAction] = useState<'guest' | 'register' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leavingToAuth, setLeavingToAuth] = useState(false);
  const saving = pendingAction !== null;

  if (onboardingComplete && replay !== '1' && !leavingToAuth) {
    return <Redirect href="/" />;
  }

  const slide = slides[index];
  const canGoBack = router.canGoBack();

  async function finish() {
    if (saving) return;
    setPendingAction('guest');
    setError(null);
    try {
      await continueAsGuest();
      router.replace('/home');
    } catch {
      setError('No pudimos guardar tu preferencia. Intentá nuevamente.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreateAccount() {
    if (saving) return;
    setPendingAction('register');
    setError(null);
    setLeavingToAuth(true);
    try {
      await continueAsGuest();
      router.push('/register');
    } catch {
      setLeavingToAuth(false);
      setError('No pudimos guardar tu preferencia. Intentá nuevamente.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Conocé ${brand.name}`}
        back="/"
        hideBack={index === 0 && !canGoBack}
        onBack={() => {
          if (saving) return;
          if (index > 0) setIndex(index - 1);
          else if (canGoBack) router.back();
        }}
        action={
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Saltar introducción"
            onPress={() => void finish()}
            disabled={saving}
            pressScale={motion.scale.button}
            style={styles.skip}
          >
            <Text style={styles.link}>Saltar</Text>
          </SpringPressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.steps} accessibilityLabel="Pasos de la introducción">
          {slides.map((item, step) => (
            <SpringPressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Ir al paso ${step + 1} de ${slides.length}`}
              accessibilityState={{ selected: step === index, disabled: saving }}
              disabled={saving}
              onPress={() => setIndex(step)}
              pressScale={motion.scale.chip}
              style={styles.stepButton}
            >
              <View style={[styles.stepLine, step <= index && styles.stepComplete]} />
            </SpringPressable>
          ))}
        </View>
        <View style={styles.slide}>
          <View style={styles.illustration}>
            <Image
              source={slide.image}
              style={styles.illustrationImage}
              contentFit="cover"
              transition={150}
              accessibilityLabel={slide.imageAlt}
            />
          </View>
          <View style={styles.copy} accessibilityLiveRegion="polite">
            <Text accessibilityRole="header" style={styles.title}>
              {slide.title}
            </Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.footerHeading}>
            <Text style={styles.progress} accessibilityLiveRegion="polite">
              {index + 1} de {slides.length}
            </Text>
            {index > 0 && (
              <SpringPressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setIndex(index - 1)}
                pressScale={motion.scale.button}
                style={styles.back}
              >
                <Ionicons name="arrow-back" size={18} color={colors.primary} />
                <Text style={styles.link}>Anterior</Text>
              </SpringPressable>
            )}
          </View>
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {index === 2 ? (
            <>
              <ActionButton
                title="Crear cuenta"
                loading={pendingAction === 'register'}
                disabled={saving}
                onPress={() => void handleCreateAccount()}
              />
              <ActionButton
                title="Explorar sin cuenta"
                secondary
                loading={pendingAction === 'guest'}
                disabled={saving}
                onPress={() => void finish()}
              />
            </>
          ) : (
            <ActionButton title="Siguiente" disabled={saving} onPress={() => setIndex(index + 1)} />
          )}
          <SpringPressable
            accessibilityRole="button"
            style={styles.skip}
            disabled={saving}
            pressScale={motion.scale.button}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.link}>Ya tengo cuenta · Iniciar sesión</Text>
          </SpringPressable>
        </View>
      </ScrollView>
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
    skip: {
      minHeight: 44,
      minWidth: 44,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    link: { fontFamily: fonts.semiBold, color: colors.primary, fontSize: 14 },
    steps: { flexDirection: 'row', gap: 8 },
    stepButton: { flex: 1, minHeight: 44, justifyContent: 'center' },
    stepLine: { height: 3, borderRadius: 2, backgroundColor: colors.border },
    stepComplete: { backgroundColor: colors.primaryAction },
    slide: { flex: 1, justifyContent: 'center', gap: 24, paddingVertical: 24 },
    illustration: {
      width: '100%',
      aspectRatio: 3 / 2,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    illustrationImage: { width: '100%', height: '100%' },
    copy: { gap: 12, minHeight: 164 },
    title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.text },
    description: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.brandDark,
    },
    footer: { gap: 12 },
    footerHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 44,
    },
    back: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 44,
      minWidth: 44,
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    progress: { fontFamily: fonts.regular, fontSize: 14, color: colors.brandDark },
    error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.danger },
  });
