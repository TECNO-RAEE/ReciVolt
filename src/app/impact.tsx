import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CitizenPage, InfoNote, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { DevicePreparationArtwork } from '@/components/ui/EcoArtwork';
import { colors, fonts } from '@/theme';

const steps = [
  {
    title: 'Hacé una copia de tus archivos',
    body: 'Guardá tus fotos, documentos y archivos importantes.',
  },
  { title: 'Cerrá tus sesiones', body: 'Salí de tus cuentas de correo, redes y otros servicios.' },
  {
    title: 'Restablecé el dispositivo',
    body: 'Volvé a la configuración de fábrica para eliminar tu información personal.',
  },
  {
    title: 'Separá los accesorios',
    body: 'Traé cargadores, cables y otros accesorios también para su reciclaje.',
  },
];
const answers = [
  {
    key: 'yes',
    label: 'Sí',
    text: 'Si todavía funciona o puede repararse, evaluá darle otro uso antes de reciclarlo.',
  },
  {
    key: 'no',
    label: 'No',
    text: 'Buscá un punto verde y revisá qué dispositivos recibe antes de acercarlo.',
  },
  {
    key: 'unsure',
    label: 'No estoy seguro',
    text: 'Consultá con un punto verde o un servicio técnico para conocer alternativas.',
  },
] as const;

export default function ImpactScreen() {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState<(typeof answers)[number]['key'] | null>(null);
  return (
    <CitizenPage title="Mi impacto">
      <View style={s.card}>
        <DevicePreparationArtwork />
        <Text style={styles.heroTitle}>Prepará tus dispositivos</Text>
        <Text style={s.body}>
          Antes de entregarlos, seguí estos pasos para proteger tu información y facilitar su
          correcto tratamiento.
        </Text>
      </View>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.repairCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={styles.repairHeader}
        >
          <Ionicons name="leaf-outline" size={23} color={colors.primary} />
          <Text style={styles.repairTitle}>¿Se puede reparar o reutilizar?</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {expanded && (
          <View style={styles.answers}>
            <Text style={s.body}>Elegí una opción para ver una recomendación general.</Text>
            {answers.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: answer === item.key }}
                onPress={() => setAnswer(item.key)}
                style={[styles.answer, answer === item.key && styles.answerSelected]}
              >
                <Text
                  style={[styles.answerLabel, answer === item.key && styles.answerLabelSelected]}
                >
                  {item.label}
                </Text>
                {answer === item.key && <Text style={s.body}>{item.text}</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <InfoNote>
        La política puede variar según cada punto verde. Consultá qué recibe antes de llevar el
        dispositivo.
      </InfoNote>
      <ActionButton title="Buscar un punto verde" onPress={() => router.push('/green-points')} />
    </CitizenPage>
  );
}

const styles = StyleSheet.create({
  heroTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 26, lineHeight: 34 },
  steps: { gap: 10 },
  step: {
    minHeight: 82,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  number: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 18 },
  stepCopy: { flex: 1, gap: 3 },
  stepTitle: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22 },
  stepBody: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  repairCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  repairHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  repairTitle: { flex: 1, color: colors.text, fontFamily: fonts.semiBold, fontSize: 16 },
  answers: { padding: 16, gap: 10, borderTopWidth: 1, borderColor: colors.border },
  answer: {
    minHeight: 46,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  answerSelected: { backgroundColor: colors.primarySoft, borderColor: colors.borderPrimary },
  answerLabel: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 15 },
  answerLabelSelected: { color: colors.primaryDark },
});
