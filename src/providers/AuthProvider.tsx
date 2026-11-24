import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/config/supabase';
import {
  activeMemberships,
  resolveRole,
  type Access,
  type AppRole,
  type CompanyMembership,
} from '@/models/Access';
import type { Profile } from '@/models/Profile';
import type { AuthIntent } from '@/models/AuthFlow';
import { getAccess } from '@/services/access.service';
import { logout as logoutService, updateRecoveredPassword } from '@/services/auth.service';
import { getAccessPreferences, saveOnboardingComplete } from '@/services/onboarding.service';
import { getProfile } from '@/services/profile.service';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  access: Access | null;
  role: AppRole | null;
  company: CompanyMembership | null;
  loading: boolean;
  accessError: string | null;
  recoveringPassword: boolean;
  completePasswordRecovery: (password: string) => Promise<void>;
  guest: boolean;
  onboardingComplete: boolean;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  retryAccess: () => void;
  selectCompany: (companyId: string) => void;
  invitationsPostponed: boolean;
  postponeInvitations: () => void;
  authIntent: AuthIntent | null;
  prepareAuth: (intent: AuthIntent | null) => void;
  clearAuthIntent: () => void;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
type LoadedAccount = {
  token: string;
  profile: Profile | null;
  access: Access | null;
  error: string | null;
};

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [account, setAccount] = useState<LoadedAccount | null>(null);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [postponedInvitationsUserId, setPostponedInvitationsUserId] = useState<string | null>(
    null
  );
  const [revision, setRevision] = useState(0);
  const [authIntent, prepareAuth] = useState<AuthIntent | null>(null);
  const clearAuthIntent = useCallback(() => prepareAuth(null), []);

  useEffect(() => {
    let mounted = true;
    void getAccessPreferences()
      .then((preferences) => {
        if (!mounted) return;
        setOnboardingComplete(preferences.onboardingComplete);
      })
      .catch(() => {
        // Storage unavailable: retain safe defaults for this session.
      })
      .finally(() => {
        if (mounted) setPreferencesReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // No database calls inside Auth's synchronous callback.
      setSession(newSession);
      setSessionReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true);
      if (event === 'SIGNED_OUT') {
        prepareAuth(null);
        setRecoveringPassword(false);
        setAccount(null);
        setSelectedCompanyId(null);
        setPostponedInvitationsUserId(null);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const token = session?.access_token;
  const userId = session?.user.id;
  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    void Promise.all([getProfile(userId), getAccess(userId, session?.user.email)])
      .then(([profile, access]) => {
        if (!profile) throw new Error('No se encontró tu perfil.');
        if (!cancelled) setAccount({ token, profile, access, error: null });
      })
      .catch(() => {
        if (!cancelled)
          setAccount({
            token,
            profile: null,
            access: null,
            error:
              'No pudimos cargar tu perfil y permisos. Revisá tu conexión e intentá nuevamente.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId, session?.user.email, revision]);

  const currentAccount = account?.token === token ? account : null;
  const access = currentAccount?.access ?? null;
  const role = session ? resolveRole(access, selectedCompanyId) : null;
  const company =
    activeMemberships(access).find((item) => item.companyId === selectedCompanyId) ??
    activeMemberships(access)[0] ??
    null;
  const guest = !session && onboardingComplete;
  const loading = !sessionReady || !preferencesReady || Boolean(session && !currentAccount);

  const logout = useCallback(async () => {
    await logoutService();
  }, []);
  const completePasswordRecovery = useCallback(async (password: string) => {
    await updateRecoveredPassword(password);
    prepareAuth(null);
    setRecoveringPassword(false);
  }, []);
  const completeOnboarding = useCallback(async () => {
    await saveOnboardingComplete();
    setOnboardingComplete(true);
  }, []);
  const continueAsGuest = useCallback(async () => {
    await saveOnboardingComplete();
    setOnboardingComplete(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady || !session || onboardingComplete || recoveringPassword) return;
    // Entering with an account also finishes the introduction for this device.
    let cancelled = false;
    void saveOnboardingComplete()
      .then(() => {
        if (!cancelled) setOnboardingComplete(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preferencesReady, session, onboardingComplete, recoveringPassword]);
  const retryAccess = useCallback(() => {
    setAccount(null);
    setRevision((value) => value + 1);
  }, []);
  const selectCompany = useCallback((companyId: string) => {
    setSelectedCompanyId(companyId);
  }, []);
  const invitationsPostponed = Boolean(userId && postponedInvitationsUserId === userId);
  const postponeInvitations = useCallback(() => {
    if (userId) setPostponedInvitationsUserId(userId);
  }, [userId]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: currentAccount?.profile ?? null,
      access,
      role,
      company,
      loading,
      accessError: currentAccount?.error ?? null,
      recoveringPassword,
      completePasswordRecovery,
      guest,
      onboardingComplete,
      logout,
      continueAsGuest,
      completeOnboarding,
      retryAccess,
      selectCompany,
      invitationsPostponed,
      postponeInvitations,
      authIntent,
      prepareAuth,
      clearAuthIntent,
    }),
    [
      session,
      currentAccount,
      access,
      role,
      company,
      loading,
      recoveringPassword,
      completePasswordRecovery,
      guest,
      onboardingComplete,
      logout,
      continueAsGuest,
      completeOnboarding,
      retryAccess,
      selectCompany,
      invitationsPostponed,
      postponeInvitations,
      authIntent,
      clearAuthIntent,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return context;
}
