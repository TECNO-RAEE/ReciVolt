import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CitizenPage, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { contactEmail, contactTopics } from '@/config/contact';
import { brand } from '@/config/brand';
import { colors } from '@/theme';

export default function ContactScreen() {
  const { topic: initialTopic } = useLocalSearchParams<{ topic?: string }>();
  const [reason, setReason] = useState<keyof typeof contactTopics>(
    initialTopic === 'reward' ? 'reward' : 'point'
  );
  const [error, setError] = useState<string | null>(null);
  const topic = contactTopics[reason];
  return (
    <CitizenPage title="Contacto" back="/settings">
      {reason === 'point' && (
        <View style={{ gap: 8 }}>
          <Text style={s.title}>¿Querés sumarte como punto verde?</Text>
          <Text style={s.body}>
            Sumate a cuidar el planeta. Cada punto verde hace la diferencia.
          </Text>
        </View>
      )}
      <View style={s.card}>
        <View style={s.row}>
          <Ionicons name="mail-outline" size={27} color={colors.primaryDark} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>Contactanos a:</Text>
            <Text selectable style={s.body}>
              {contactEmail || 'Disponible próximamente'}
            </Text>
          </View>
        </View>
        {!contactEmail && (
          <Text style={s.body}>El correo oficial de contacto todavía no está disponible.</Text>
        )}
      </View>
      <Text style={s.subtitle}>¿Cómo querés colaborar?</Text>
      <View style={{ gap: 10 }}>
        {(['point', 'reward'] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: reason === key }}
            onPress={() => {
              setReason(key);
              setError(null);
            }}
            style={[styles.option, reason === key && styles.selected]}
          >
            <Ionicons
              name={key === 'point' ? 'location-outline' : 'gift-outline'}
              size={25}
              color={colors.primaryDark}
            />
            <Text style={[s.label, { flex: 1 }]}>{contactTopics[key].title}</Text>
            <Ionicons
              name={reason === key ? 'checkmark-circle' : 'ellipse-outline'}
              size={23}
              color={reason === key ? colors.primary : colors.border}
            />
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.subtitle}>Datos para incluir en tu correo</Text>
        <Text style={s.body}>Asunto: {topic.subject}</Text>
        <View style={{ gap: 10 }}>
          {topic.fields.map((field) => (
            <View key={field} style={[s.row, { alignItems: 'flex-start', gap: 8 }]}>
              <Text style={s.body}>•</Text>
              <Text style={[s.body, { flex: 1 }]}>{field}</Text>
            </View>
          ))}
        </View>
        {reason === 'reward' && (
          <Text style={s.body}>
            El equipo revisará la propuesta. Los administradores publican los premios aprobados.
          </Text>
        )}
      </View>
      <ActionButton
        title="Preparar correo"
        disabled={!contactEmail}
        onPress={() => {
          if (!contactEmail) return;
          setError(null);
          const body = `Hola, equipo de ${brand.name}.\n\n${topic.fields.map((field) => `${field}: `).join('\n')}\n\nGracias.`;
          void Linking.openURL(
            `mailto:${contactEmail}?subject=${encodeURIComponent(topic.subject)}&body=${encodeURIComponent(body)}`
          ).catch(() =>
            setError(
              'No pudimos abrir tu aplicación de correo. Podés escribir al email que aparece arriba.'
            )
          );
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={s.body}>
          {error}
        </Text>
      )}
    </CitizenPage>
  );
}
const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
});
