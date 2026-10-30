import { useCallback } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { usePortalData } from '@/hooks/usePortalData';
import { getDeliveryPhotoUrl } from '@/services/delivery.service';
import { colors, fonts } from '@/theme';

type DeliveryPhotoPreviewProps = {
  readonly path: string;
};

export function DeliveryPhotoPreview({ path }: DeliveryPhotoPreviewProps) {
  const loader = useCallback(() => getDeliveryPhotoUrl(path), [path]);
  const { data, loading } = usePortalData(loader);

  if (loading) {
    return (
      <View style={styles.photoLoadingBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.notesLabel}>Foto adjunta por el ciudadano:</Text>
      <Image
        source={{ uri: data }}
        accessibilityLabel="Foto de los residuos adjunta por el ciudadano"
        style={styles.photoPreview}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  notesLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  photoLoadingBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 6,
  },
});
