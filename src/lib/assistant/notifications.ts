/**
 * Notifications Web (Notifications API) — FR-010 / AC-010.
 * Les annonces vocales fonctionnent SANS permission ; les notifications ajoutent
 * une alerte visuelle et exigent que l'onglet reste ouvert dans le navigateur.
 * Toutes les opérations sont défensives (try/catch) : jamais de crash.
 */

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface NotifyOptions {
  title: string
  body?: string
  /** true => notification muette (sans son, si le navigateur le supporte) */
  silent?: boolean
  /** tag = remplace une notification précédente identique */
  tag?: string
}

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission === 'granted' ? 'granted' : 'denied'
  }
}

/**
 * Affiche une notification système si la permission est accordée.
 * @returns true si la notification a été créée.
 */
export function notify(options: NotifyOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      silent: options.silent ?? false,
    })
    return true
  } catch {
    return false
  }
}
