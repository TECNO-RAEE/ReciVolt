import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CitizenPage, InfoNote, useRewardStyles } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  buildContactMailBody,
  contactEmail,
  contactTopics,
  resolveContactTopic,
  type ContactTopicKey,
} from '@/config/contact';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

const topicKeys = ['support', 'point', 'reward'] as const;

const topicIcons: Record<
  ContactTopicKey,
  'chatbubble-ellipses-outline' | 'location-outline' | 'gift-outline'
> = {
  support: 'chatbubble-ellipses-outline',
  point: 'location-outline',
  reward: 'gift-outline',
};

export default function ContactScreen() {
  const { topic: initialTopic } = useLocalSearchParams<{ topic?: string | string[] }>();
  const initialReason = resolveContactTopic(initialTopic);
  return <ContactContent key={initialReason} initialReason={initialReason} />;
}

function ContactContent({ initialReason }: Readonly<{ initialReason: ContactTopicKey }>) {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const [reason, setReason] = useState<ContactTopicKey>(initialReason);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const topic = contactTopics[reason];

  async function copyEmail() {
    if (!contactEmail) return;
    setError(null);
    try {
      await Clipboard.setStringAsync(contactEmail);
      setCopiedEmail(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      setError('No pudimos copiar el correo. Podés seleccionarlo manualmente.');
    }
  }

  async function copyTemplate() {
    if (!contactEmail) return;
    setError(null);
    setNotice(null);
    const body = buildContactMailBody(reason);
    const template = `Para: ${contactEmail}\nAsunto: ${topic.subject}\n\n${body}`;
    try {
      await Clipboard.setStringAsync(template);
      setNotice('Plantilla copiada. Podés pegarla en tu correo.');
    } catch {
      setError('No pudimos copiar la plantilla. Podés escribir al email que aparece arriba.');
    }
  }

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
          {Boolean(contactEmail) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar correo de contacto"
              style={styles.copyButton}
              onPress={() => void copyEmail()}
            >
              <Ionicons
                name={copiedEmail ? 'checkmark' : 'copy-outline'}
                size={20}
                color={copiedEmail ? colors.primaryDark : colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
        {copiedEmail && (
          <Text accessibilityLiveRegion="polite" style={styles.copiedText}>
            Correo copiado
          </Text>
        )}
        {!contactEmail && (
          <InfoNote>El correo oficial de contacto todavía no está disponible.</InfoNote>
        )}
      </View>
      {Boolean(contactEmail) && (
        <>
          <Text style={s.subtitle}>¿En qué te podemos ayudar?</Text>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {topicKeys.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === key }}
                onPress={() => {
                  setReason(key);
                  setError(null);
                  setNotice(null);
                }}
                style={[styles.option, reason === key && styles.selected]}
              >
                <Ionicons name={topicIcons[key]} size={25} color={colors.primaryDark} />
                <Text style={[s.label, { flex: 1 }]}>{contactTopics[key].title}</Text>
                <Ionicons
                  name={reason === key ? 'checkmark-circle' : 'ellipse-outline'}
                  size={23}
                  color={reason === key ? colors.primary : colors.textSecondary}
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
            onPress={() => {
              setError(null);
              setNotice(null);
              const body = buildContactMailBody(reason);
              void Linking.openURL(
                `mailto:${contactEmail}?subject=${encodeURIComponent(topic.subject)}&body=${encodeURIComponent(body)}`
              ).catch(() =>
                setError(
                  'No pudimos abrir tu aplicación de correo. Podés copiar el correo o la plantilla.'
                )
              );
            }}
          />
          <ActionButton
            title="Copiar plantilla de correo"
            secondary
            onPress={() => void copyTemplate()}
          />
        </>
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
          {notice}
        </Text>
      )}
    </CitizenPage>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    copyButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copiedText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.primaryDark,
    },
    errorText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.danger,
    },
    noticeText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      color: colors.primaryDark,
    },
  });
