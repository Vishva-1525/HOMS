export interface NotificationLog {
  id: string
  user_id: string
  type: string
  message: string
  read_at: string | null
  created_at: string
  outpass_id?: string | null
  extension_id?: string | null
}

export const NOTIFICATION_DOT_COLORS: Record<string, string> = {
  pending: '#D97706',
  overdue: '#DC2626',
  extension: '#1A5CA0',
  approved: '#2E8B44',
  rejected: '#DC2626',
  info: '#1A5CA0',
}

export function getNotificationDotColor(type: string): string {
  return NOTIFICATION_DOT_COLORS[type] ?? NOTIFICATION_DOT_COLORS.info
}

export function getNotificationTitle(type: string): string {
  switch (type) {
    case 'pending':
      return 'New outpass request'
    case 'approved':
      return 'Request approved'
    case 'rejected':
      return 'Request rejected'
    case 'extension':
      return 'Extension request'
    case 'overdue':
      return 'Overdue alert'
    default:
      return 'HOMS notification'
  }
}

/** Role-aware deep link for in-app and push notification taps. */
export function getNotificationUrl(
  role: string | null | undefined,
  notification: Pick<NotificationLog, 'type' | 'outpass_id'>,
): string {
  if (role === 'student' && notification.outpass_id) {
    return `/student/passes?pass=${notification.outpass_id}`
  }
  if (role === 'warden') {
    if (notification.type === 'extension') return '/warden/extensions'
    if (notification.type === 'pending') return '/warden/pending'
    return '/warden/dashboard'
  }
  if (role === 'parent') return '/parent/dashboard'
  if (role === 'student') return '/student/passes'
  return '/'
}
