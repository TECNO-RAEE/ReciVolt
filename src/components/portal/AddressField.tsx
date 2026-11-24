import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import {
  addressAutocompleteEnabled,
  suggestAddresses,
  type AddressSuggestion,
} from '@/services/address.service';
import { useColors } from '@/theme';
import { PortalField, PortalLink, usePortalStyles } from './PortalUI';

export function AddressField({
  value,
  onChange,
  onSelect,
  disabled = false,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressSuggestion) => void;
  disabled?: boolean;
}>) {
  const colors = useColors();
  const s = usePortalStyles();
  const [state, setState] = useState<{
    query: string;
    rows: AddressSuggestion[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [selected, setSelected] = useState(value);
  const request = useRef(0);
  useEffect(() => {
    const generation = ++request.current;
    if (!addressAutocompleteEnabled || value.trim().length < 3 || value === selected || disabled)
      return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ query: value, rows: [], loading: true, error: null });
      void suggestAddresses(value, controller.signal)
        .then((rows) => {
          if (generation === request.current && !controller.signal.aborted)
            setState({ query: value, rows, loading: false, error: null });
        })
        .catch(() => {
          if (generation === request.current && !controller.signal.aborted)
            setState({
              query: value,
              rows: [],
              loading: false,
              error: 'No pudimos buscar la dirección. Podés marcarla en el mapa.',
            });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, selected, disabled]);
  const current = state?.query === value && value !== selected && !disabled ? state : null;
  return (
    <View style={s.stack}>
      <PortalField
        label="Dirección"
        placeholder="Calle, altura y localidad"
        value={value}
        onChangeText={onChange}
        maxLength={500}
        editable={!disabled}
      />
      {current?.loading && (
        <ActivityIndicator accessibilityLabel="Buscando direcciones" color={colors.primary} />
      )}
      {current?.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {current.error}
        </Text>
      )}
      {current?.rows.map((row) => (
        <View key={row.id} style={s.row}>
          <PortalLink
            title={row.address}
            onPress={() => {
              setSelected(row.address);
              setState(null);
              onSelect(row);
            }}
          />
        </View>
      ))}
      {current && !current.loading && !current.error && current.rows.length === 0 && (
        <Text style={s.hint}>
          No encontramos sugerencias. Completá la dirección y marcá el lugar en el mapa.
        </Text>
      )}
      {current?.rows.length ? (
        <Text style={s.hint}>Direcciones de Geoapify · OpenStreetMap</Text>
      ) : null}
      {!addressAutocompleteEnabled && (
        <PortalLink
          title="Buscar dirección en OpenStreetMap"
          disabled={disabled || !value.trim()}
          onPress={() =>
            void Linking.openURL(
              `https://www.openstreetmap.org/search?query=${encodeURIComponent(value)}`
            )
          }
        />
      )}
    </View>
  );
}
