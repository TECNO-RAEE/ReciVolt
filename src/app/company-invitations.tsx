import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, type TextInputInstance, View } from 'react-native';
import { supabase } from '@/config/supabase';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { ActionButton } from '@/components/ui/ActionButton';
import { InfoNote } from '@/components/rewards/RewardsUI';
import {
  PortalPage,
  PortalFeedback,
  PortalLoading,
  usePortalStyles,
} from '@/components/portal/PortalUI';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { roleHome } from '@/models/Access';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthFlowArrival } from '@/hooks/useAuthFlowArrival';
import { authRoute } from '@/models/AuthFlow';
import { getMyInvitations, portalCommand } from '@/services/portal.service';

export default function CompanyInvitationsScreen() {
  useAuthFlowArrival();
  const s = usePortalStyles();
  const { session, role, postponeInvitations } = useAuth();
  const url = Linking.useURL();
  const [emailInvite, setEmailInvite] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const handledUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!url) return;
    const hash = new URLSearchParams(url.split('#')[1] ?? '');
    const accessToken = hash.get('access_token'),
      refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      if (handledUrl.current === url) return;
      handledUrl.current = url;
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setLinkError('La invitación venció. Pedí un nuevo email o iniciá sesión.');
          else {
            setEmailInvite(hash.get('type') === 'invite');
            router.replace('/company-invitations');
          }
        });
    }
  }, [url]);
  const handleBack = () => {
    if (!session) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    if (role === 'citizen') {
      postponeInvitations();
      router.replace('/home');
      return;
    }
    router.replace(role ? roleHome(role) : '/');
  };
  return (
    <PortalPage
      title="Invitaciones de empresa"
      subtitle="Aceptá tu acceso para comenzar a trabajar con tu organización."
      back={session && role ? roleHome(role) : '/'}
      onBack={handleBack}
    >
      <PortalFeedback error={linkError} />
      {session ? (
        <Invitations key={session.user.id} needsPassword={emailInvite} />
      ) : (
        <View style={s.stack}>
          <Text style={s.body}>
            Ingresá con el email al que enviaron la invitación. Si es tu primera cuenta, abrí el
            enlace del email para configurar tu contraseña.
          </Text>
          <ActionButton
            title="Iniciar sesión"
            onPress={() => router.push(authRoute('/login', 'invitations'))}
          />
        </View>
      )}
    </PortalPage>
  );
}
function Invitations({ needsPassword }: Readonly<{ needsPassword: boolean }>) {
  const s = usePortalStyles();
  const { data, loading, error, refresh } = usePortalData(getMyInvitations);
  const { session, role, retryAccess, postponeInvitations, logout } = useAuth();
  const action = usePortalAction();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const confirmPasswordRef = useRef<TextInputInstance>(null);
  const showPasswordSetup = needsPassword && Boolean(data?.length);
  return (
    <>
      {session?.user.email && <Text style={s.hint}>Sesión iniciada como {session.user.email}</Text>}
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {showPasswordSetup && (
        <View style={s.stack}>
          <View style={{ gap: 6 }}>
            <AuthTextField
              label="Creá tu contraseña (mínimo 8 caracteres)"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              editable={!action.busy}
            />
          </View>
          <View style={{ gap: 6 }}>
            <AuthTextField
              label="Repetí la contraseña"
              iconName="lock-closed-outline"
              inputRef={confirmPasswordRef}
              value={confirm}
              onChangeText={setConfirm}
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              editable={!action.busy}
            />
          </View>
        </View>
      )}
      {data?.length === 0 && (
        <Text style={s.body}>No tenés invitaciones pendientes para esta cuenta.</Text>
      )}
      {data?.map((inv) => (
        <View key={inv.id} style={s.row}>
          <Text style={s.subtitle}>{inv.companyName}</Text>
          <Text style={s.body}>
            {inv.role === 'company_owner' ? 'Responsable de empresa' : 'Trabajador'} · {inv.email}
          </Text>
          <ActionButton
            title="Aceptar y entrar a la empresa"
            loading={action.busy && busyAction === inv.id}
            disabled={action.busy}
            onPress={() => {
              setBusyAction(inv.id);
              void action
                .run(async () => {
                  if (needsPassword) {
                    if (password.length < 8 || password !== confirm)
                      throw new Error(
                        'Las contraseñas deben coincidir y tener al menos 8 caracteres.'
                      );
                    const { error: passwordError } = await supabase.auth.updateUser({ password });
                    if (passwordError) throw passwordError;
                  }
                  await portalCommand('accept_invitation', { id: inv.id });
                  retryAccess();
                  router.replace('/');
                }, 'Acceso aceptado.')
                .finally(() => setBusyAction(null));
            }}
          />
        </View>
      ))}
      <PortalFeedback error={action.error} notice={action.notice} />
      {Boolean(data?.length) && role === 'citizen' && (
        <InfoNote>
          Si todavía no querés responder, podés continuar como ciudadano y decidir más tarde, o
          cerrar sesión para usar otra cuenta.
        </InfoNote>
      )}
      <View style={s.stack}>
        {role && (
          <ActionButton
            title={
              role === 'citizen'
                ? data?.length
                  ? 'Continuar como ciudadano'
                  : 'Ir al inicio'
                : 'Ir a mi portal'
            }
            secondary
            disabled={action.busy}
            onPress={() => {
              if (role === 'citizen') postponeInvitations();
              router.replace(roleHome(role));
            }}
          />
        )}
        <ActionButton
          title="Cerrar sesión"
          secondary
          loading={action.busy && busyAction === 'logout'}
          disabled={action.busy}
          onPress={() => {
            setBusyAction('logout');
            void action
              .run(async () => {
                try {
                  await logout();
                } catch {
                  throw new Error('No pudimos cerrar la sesión. Intentá nuevamente.');
                }
                router.replace('/');
              }, '')
              .finally(() => setBusyAction(null));
          }}
        />
      </View>
    </>
  );
}
