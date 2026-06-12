export interface NotificationLog {
  id: string
  user_id: string
  type: string
  message: string
  read_at: string | null
  created_at: string
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
