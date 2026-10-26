import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts } from '@/theme';
import { brand } from '@/config/brand';

const slides = [
  {
    title: 'Dale una segunda vida a tu tecnología',
    description:
      'Celulares, notebooks y otros aparatos en desuso pueden convertirse en nuevos recursos.',
  },
  {
    title: 'Encontrá puntos verdes cerca tuyo',
    description:
      'Buscá por dispositivo y consultá qué recibe cada punto, su dirección y sus horarios.',
  },
  {
    title: 'Reciclá, generá impacto y obtené beneficios',
    description: 'Creá tu cuenta para registrar tus entregas y acompañar cada paso de tu impacto.',
  },
] as const;
export default function OnboardingScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { onboardingComplete, continueAsGuest } = useAuth();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (onboardingComplete && replay !== '1') return <Redirect href="/" />;
  const slide = slides[index];
  async function finish() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await continueAsGuest();
      router.replace('/home');
    } catch {
      setError('No pudimos guardar tu preferencia. Intentá nuevamente.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Conocé ${brand.name}`}
        back="/"
        onBack={() => {
          if (saving) return;
          if (index > 0) setIndex(index - 1);
          else if (router.canGoBack()) router.back();
          else void finish();
        }}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saltar introducción"
            onPress={() => void finish()}
            disabled={saving}
            style={styles.skip}
          >
            <Text style={styles.link}>Saltar</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.steps} accessibilityLabel="Pasos de la introducción">
          {slides.map((item, step) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Ir al paso ${step + 1} de ${slides.length}`}
              accessibilityState={{ selected: step === index, disabled: saving }}
              disabled={saving}
              onPress={() => setIndex(step)}
              style={styles.stepButton}
            >
              <View style={[styles.stepLine, step <= index && styles.stepComplete]} />
            </Pressable>
          ))}
        </View>
        <View style={styles.slide}>
          <View
            style={styles.illustration}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            aria-hidden
          >
            {index === 0 ? (
              <>
                <Ionicons name="laptop-outline" size={104} color={colors.primary} />
                <Ionicons name="phone-portrait-outline" size={48} color={colors.primary} />
                <Ionicons name="arrow-forward-outline" size={24} color={colors.brandDark} />
                <Ionicons name="leaf-outline" size={48} color={colors.primary} />
              </>
            ) : index === 1 ? (
              <>
                <Ionicons name="map-outline" size={120} color={colors.primary} />
                <Ionicons name="location-outline" size={72} color={colors.primary} />
              </>
            ) : (
              <>
                <Ionicons name="leaf-outline" size={112} color={colors.primary} />
                <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
              </>
            )}
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
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setIndex(index - 1)}
                style={styles.back}
              >
                <Ionicons name="arrow-back" size={18} color={colors.primary} />
                <Text style={styles.link}>Anterior</Text>
              </Pressable>
            )}
          </View>
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <ActionButton
            title={index === 2 ? 'Comenzar' : 'Siguiente'}
            loading={saving}
            onPress={() => {
              if (index === 2) void finish();
              else setIndex(index + 1);
            }}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.skip}
            disabled={saving}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.link}>Ya tengo cuenta · Iniciar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  skip: { paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center' },
  link: { fontFamily: fonts.semiBold, color: colors.primary, fontSize: 14 },
  steps: { flexDirection: 'row', gap: 8 },
  stepButton: { flex: 1, minHeight: 44, justifyContent: 'center' },
  stepLine: { height: 3, borderRadius: 2, backgroundColor: colors.border },
  stepComplete: { backgroundColor: colors.primary },
  slide: { flex: 1, justifyContent: 'center', gap: 24, paddingVertical: 24 },
  illustration: {
    minHeight: 200,
    paddingVertical: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  copy: { gap: 12, minHeight: 164 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.brandDark },
  footer: { gap: 12 },
  footerHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  progress: { fontFamily: fonts.regular, fontSize: 14, color: colors.brandDark },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.danger },
});
