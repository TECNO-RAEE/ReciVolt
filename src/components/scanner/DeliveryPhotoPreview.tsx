import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalData } from '@/hooks/usePortalData';
import { getDeliveryPhotoUrl } from '@/services/delivery.service';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

type DeliveryPhotoPreviewProps = {
  readonly path: string;
};

export function DeliveryPhotoPreview({ path }: DeliveryPhotoPreviewProps) {
  return <DeliveryPhotoPreviewContent key={path} path={path} />;
}

function DeliveryPhotoPreviewContent({ path }: DeliveryPhotoPreviewProps) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const loader = useCallback(() => getDeliveryPhotoUrl(path), [path]);
  const { data, loading, refreshing, error, refresh } = usePortalData(loader);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.notesLabel}>Foto adjunta por el ciudadano:</Text>
      {loading || refreshing ? (
        <View style={styles.photoLoadingBox}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando foto adjunta" />
        </View>
      ) : error || imageFailed || !data ? (
        <View style={styles.errorBox}>
          <PortalFeedback error={error ?? 'No pudimos cargar la foto adjunta.'} />
          <ActionButton
            secondary
            title="Reintentar"
            onPress={() => {
              setImageFailed(false);
              void refresh();
            }}
          />
        </View>
      ) : (
        <Image
          source={{ uri: data }}
          accessibilityLabel="Foto de los residuos adjunta por el ciudadano"
          style={styles.photoPreview}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    errorBox: {
      gap: 10,
      marginTop: 6,
    },
    photoPreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginTop: 6,
    },
  });
