import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { CitizenPage, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { termsUrl } from '@/config/legal';
import { brand } from '@/config/brand';
import { colors } from '@/theme';

export default function TermsScreen() {
  const [error, setError] = useState<string | null>(null);
  return (
    <CitizenPage title="Términos de uso" back="/settings">
      <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
        <Ionicons name="document-text-outline" size={42} color={colors.primaryDark} />
        <Text style={s.subtitle}>
          {termsUrl ? 'Contrato de uso de la app' : 'Todavía no hay términos publicados'}
        </Text>
        <Text style={[s.body, { textAlign: 'center' }]}>
          {termsUrl
            ? `Consultá el documento vigente con las condiciones de uso de ${brand.name}.`
            : 'Cuando estén disponibles, podrás consultar el documento desde esta sección.'}
        </Text>
      </View>
      {termsUrl && (
        <ActionButton
          title="Consultar términos de uso"
          onPress={() => {
            if (!termsUrl) return;
            setError(null);
            void Linking.openURL(termsUrl).catch(() =>
              setError('No pudimos abrir el documento. Intentá nuevamente.')
            );
          }}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.body}>
          {error}
        </Text>
      )}
    </CitizenPage>
  );
}
