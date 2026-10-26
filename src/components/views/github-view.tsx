'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Github, GitBranch, Loader2, LockKeyhole, Search, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

type Repository = {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  description: string | null
  isPrivate: boolean
  defaultBranch: string
  owner: string
  updatedAt: string
}

interface GithubViewProps {
  onImported: () => void
  onUnauthorized: () => void
}

export function GithubView({ onImported, onUnauthorized }: GithubViewProps) {
  const { toast } = useToast()
  const [token, setToken] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [query, setQuery] = useState('')
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Repository | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr')
    return repositories.filter((repo) => {
      const visibilityMatch = visibility === 'all' || (visibility === 'private' ? repo.isPrivate : !repo.isPrivate)
      const queryMatch = !normalized || repo.fullName.toLocaleLowerCase('fr').includes(normalized) || (repo.description ?? '').toLocaleLowerCase('fr').includes(normalized)
      return visibilityMatch && queryMatch
    })
  }, [repositories, query, visibility])

  async function requestRepositories(nextQuery = query, nextVisibility = visibility) {
    if (!token.trim()) {
      setError('Saisissez un token GitHub pour consulter les dépôts accessibles.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/github/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action: 'list', token: token.trim(), query: nextQuery, visibility: nextVisibility }),
      })
      const payload = await response.json() as { repositories?: Repository[]; error?: string }
      if (response.status === 401 && payload.error === 'Authentification requise.') {
        onUnauthorized()
        return
      }
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger les dépôts.')
      setRepositories(payload.repositories ?? [])
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  async function importRepository() {
    if (!selected || !token.trim()) return
    setImporting(true)
    try {
      const response = await fetch('/api/github/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'import',
          token: token.trim(),
          repositoryId: selected.id,
          name: selected.name,
          fullName: selected.fullName,
          htmlUrl: selected.htmlUrl,
          description: selected.description,
          defaultBranch: selected.defaultBranch,
          isPrivate: selected.isPrivate,
        }),
      })
      const payload = await response.json() as { error?: string }
      if (response.status === 401 && payload.error === 'Authentification requise.') {
        onUnauthorized()
        return
      }
      if (!response.ok) throw new Error(payload.error ?? "L'import a échoué.")
      toast({ title: 'Dépôt importé', description: `${selected.fullName} est maintenant associé à un projet DevOS.` })
      setSelected(null)
      onImported()
    } catch (cause) {
      toast({ title: 'Import impossible', description: cause instanceof Error ? cause.message : 'Une erreur est survenue.', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  function clearToken() {
    setToken('')
    setSubmitted(false)
    setRepositories([])
    setSelected(null)
    setError('')
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Développement / Intégrations</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dépôts GitHub</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Consultez les dépôts auxquels votre token donne accès, puis importez explicitement ceux que vous souhaitez suivre dans DevOS.</p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5"><ShieldCheck className="size-3.5" aria-hidden="true" /> Token temporaire</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Github className="size-5" aria-hidden="true" /> Connexion à GitHub</CardTitle>
          <CardDescription>Utilisez un token personnel avec uniquement les permissions nécessaires pour lire les dépôts que vous voulez importer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); void requestRepositories('', 'all') }}>
            <div className="grid gap-1.5">
              <Label htmlFor="github-token">Token personnel GitHub</Label>
              <Input id="github-token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={(event) => setToken(event.target.value)} placeholder="ghp_… ou github_pat_…" className="h-11 font-mono" aria-describedby="github-token-help" />
              <p id="github-token-help" className="text-xs text-muted-foreground">Gardé uniquement en mémoire dans cette page. Il sera effacé au rechargement ou à la déconnexion.</p>
            </div>
            <Button type="submit" disabled={loading || !token.trim()} className="min-h-11 self-end">{loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Github className="size-4" aria-hidden="true" />} {submitted ? 'Actualiser' : 'Charger les dépôts'}</Button>
            <Button type="button" variant="outline" onClick={clearToken} disabled={!token && !submitted} className="min-h-11 self-end">Effacer</Button>
          </form>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> DevOS ne sauvegarde pas ce token dans sa base de données ou dans le stockage du navigateur. Ne collez pas un token auquel vous avez accordé des permissions inutiles.</p>
        </CardContent>
      </Card>

      {error ? <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

      {submitted ? (
        <section className="space-y-3" aria-label="Dépôts GitHub accessibles">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-semibold">Dépôts accessibles</h3><p className="text-sm text-muted-foreground">{repositories.length} dépôt(s) récupéré(s) depuis GitHub</p></div>
            <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_10rem]">
              <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un dépôt…" className="h-11 pl-9" aria-label="Rechercher un dépôt" /></div>
              <Select value={visibility} onValueChange={(value) => setVisibility(value as typeof visibility)}><SelectTrigger className="h-11" aria-label="Filtrer par visibilité"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="public">Publics</SelectItem><SelectItem value="private">Privés</SelectItem></SelectContent></Select>
            </div>
          </div>
          {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Actualisation des dépôts…</div> : filtered.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center gap-2 py-10 text-center"><Github className="size-8 text-muted-foreground" aria-hidden="true" /><p className="font-medium">Aucun dépôt correspondant</p><p className="text-sm text-muted-foreground">Modifiez la recherche ou vérifiez les autorisations du token.</p></CardContent></Card>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2" aria-label="Résultats GitHub">
              {filtered.map((repo) => (
                <li key={repo.id}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Github className="size-4" aria-hidden="true" /></span><div className="min-w-0"><h4 className="break-words font-medium">{repo.fullName}</h4><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{repo.description || 'Aucune description renseignée.'}</p></div></div>
                        <Badge variant="outline" className="shrink-0">{repo.isPrivate ? <><LockKeyhole className="mr-1 size-3" aria-hidden="true" /> Privé</> : 'Public'}</Badge>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><GitBranch className="size-3.5" aria-hidden="true" /> {repo.defaultBranch || 'Branche par défaut inconnue'}</span><a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"><ExternalLink className="size-3.5" aria-hidden="true" /> Ouvrir sur GitHub</a></div>
                      <Button className="min-h-11 w-full" variant="outline" onClick={() => setSelected(repo)}>Importer dans DevOS</Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Github className="size-10 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">Aucun dépôt chargé</h3><p className="max-w-md text-sm text-muted-foreground">Les dépôts ne sont pas recherchés tant que vous n'avez pas fourni et soumis votre token GitHub.</p></CardContent></Card>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer l’import du dépôt ?</DialogTitle><DialogDescription>DevOS va créer un projet lié à <strong>{selected?.fullName}</strong>. Aucun code ne sera cloné et aucun changement ne sera envoyé à GitHub.</DialogDescription></DialogHeader>
          <div className="rounded-lg border p-3 text-sm"><p className="font-medium">{selected?.name}</p><p className="mt-1 break-all text-muted-foreground">{selected?.htmlUrl}</p><p className="mt-2 text-xs text-muted-foreground">Branche par défaut : {selected?.defaultBranch || 'non renseignée'}</p></div>
          <DialogFooter><Button variant="outline" className="min-h-11" onClick={() => setSelected(null)} disabled={importing}>Annuler</Button><Button className="min-h-11" onClick={() => void importRepository()} disabled={importing}>{importing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null} Confirmer l’import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
