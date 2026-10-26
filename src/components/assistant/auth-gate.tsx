'use client'

/**
 * AuthGate — porte d'entrée de la page unique `/` (FEATURE-AUTH).
 *
 * - session en cours de vérification → écran d'attente (aucun flash du contenu) ;
 * - non connecté → formulaire Connexion / Inscription (shadcn/ui, ARIA complet) ;
 * - connecté → rend DevOSApp avec l'utilisateur, la déconnexion et le callback
 *   d'expiration de session (401 renvoyé par les endpoints métier).
 *
 * Le miroir localStorage des préférences (`devos-voice-prefs`) est effacé à chaque
 * changement d'état d'authentification : les préférences sont désormais PAR
 * UTILISATEUR côté serveur, le miroir d'un précédent compte ne doit jamais fuiter
 * vers le suivant.
 */

import { useCallback, useState } from 'react'
import { Loader2, Mic } from 'lucide-react'

import { DevOSApp } from '@/components/assistant/dev-os-app'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { PREFS_STORAGE_KEY } from '@/hooks/use-voice-assistant'
import { useSession } from '@/hooks/use-session'
import type { AuthUser } from '@/types/assistant'

function clearPrefsMirror(): void {
  try {
    window.localStorage.removeItem(PREFS_STORAGE_KEY)
  } catch {
    // quota indisponible / navigation privée : rien à faire
  }
}

type AuthMode = 'login' | 'register'

interface AuthFormProps {
  onAuthenticated: (user: AuthUser) => void
  onLogin: (email: string, password: string) => Promise<AuthUser>
  onRegister: (name: string, email: string, password: string) => Promise<AuthUser>
}

/** Formulaire Connexion / Inscription (onglets), validation minimale côté client. */
function AuthForm({ onAuthenticated, onLogin, onRegister }: AuthFormProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState<AuthMode | null>(null)

  const submit = useCallback(
    async (mode: AuthMode) => {
      if (pending) return
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        toast({
          title: 'Champs requis',
          description: 'Renseignez votre email et votre mot de passe.',
          variant: 'destructive',
        })
        return
      }
      if (mode === 'register' && password.length < 8) {
        toast({
          title: 'Mot de passe trop court',
          description: '8 caractères minimum.',
          variant: 'destructive',
        })
        return
      }
      setPending(mode)
      try {
        const authenticated =
          mode === 'login'
            ? await onLogin(trimmedEmail, password)
            : await onRegister(name, trimmedEmail, password)
        onAuthenticated(authenticated)
      } catch (error) {
        toast({
          title: mode === 'login' ? 'Connexion impossible' : 'Inscription impossible',
          description: error instanceof Error ? error.message : 'Une erreur est survenue.',
          variant: 'destructive',
        })
      } finally {
        setPending(null)
      }
    },
    [email, name, onAuthenticated, onLogin, onRegister, password, pending, toast],
  )

  return (
    // min-h-dvh + my-auto (et non justify-center) : centrage « sûr » — quand le
    // clavier iOS / un écran paysage réduit la hauteur, l'auto-marge retombe à 0
    // et le haut du formulaire reste atteignable au scroll (pas de contenu
    // clippé au-dessus du viewport). min-h-dvh suit la barre dynamique Safari.
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-6 sm:py-10">
      <div className="my-auto flex w-full max-w-md flex-col items-center">
        <h1 className="sr-only">DevOS — Assistant vocal proactif</h1>
        <Card className="w-full gap-4 py-4 sm:gap-6 sm:py-6">
          <CardHeader className="px-4 text-center sm:px-6">
            <div
              className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <Mic className="size-6" />
            </div>
            <CardTitle className="text-xl">DevOS</CardTitle>
            <CardDescription>
              Assistant vocal proactif — connectez-vous pour retrouver vos tâches et vos rappels.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Tabs defaultValue="login">
              <TabsList className="grid h-11 w-full grid-cols-2">
                <TabsTrigger value="login" className="min-h-11 sm:min-h-9">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="register" className="min-h-11 sm:min-h-9">
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submit('login')
                  }}
                  className="space-y-4"
                  aria-label="Formulaire de connexion"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      placeholder="vous@exemple.fr"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={pending !== null}>
                    {pending === 'login' ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submit('register')
                  }}
                  className="space-y-4"
                  aria-label="Formulaire d'inscription"
                >
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom (optionnel)</Label>
                    <Input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      placeholder="Jean Dupont"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      placeholder="vous@exemple.fr"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11"
                      aria-describedby="register-password-help"
                    />
                    <p id="register-password-help" className="text-xs text-muted-foreground">
                      8 caractères minimum.
                    </p>
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={pending !== null}>
                    {pending === 'register' ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Créer mon compte
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mt-6 w-full text-center text-xs text-muted-foreground">
          Session sécurisée par cookie httpOnly · Mot de passe protégé par bcrypt
        </p>
      </div>
    </div>
  )
}

export function AuthGate() {
  const { user, loading, login, register, logout, signOutLocal } = useSession()
  const { toast } = useToast()

  const handleSessionExpired = useCallback(() => {
    clearPrefsMirror()
    signOutLocal()
    toast({
      title: 'Session expirée',
      description: 'Veuillez vous reconnecter.',
      variant: 'destructive',
    })
  }, [signOutLocal, toast])

  const handleLogout = useCallback(async () => {
    clearPrefsMirror()
    try {
      await logout()
      toast({ title: 'Déconnecté', description: 'À bientôt !' })
    } catch {
      // Même en cas d'échec réseau, la session locale est fermée.
      signOutLocal()
    }
  }, [logout, signOutLocal, toast])

  const handleAuthenticated = useCallback(
    (authenticated: AuthUser) => {
      clearPrefsMirror()
      toast({
        title: `Bienvenue${authenticated.name ? `, ${authenticated.name}` : ''} !`,
        description: authenticated.email,
      })
    },
    [toast],
  )

  if (loading) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background"
        role="status"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Vérification de la session…</p>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onAuthenticated={handleAuthenticated} onLogin={login} onRegister={register} />
  }

  return (
    <DevOSApp user={user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
  )
}
