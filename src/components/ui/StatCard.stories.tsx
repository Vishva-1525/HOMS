import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckCircle, FileText } from 'lucide-react'
import { StatCard } from './StatCard'

const meta = {
  title: 'UI/StatCard',
  component: StatCard,
  tags: ['autodocs'],
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Total Passes',
    value: 128,
    subtext: 'This semester',
    icon: FileText,
  },
}

export const WithTrendUp: Story = {
  args: {
    label: 'Approved',
    value: 94,
    icon: CheckCircle,
    trend: { value: '+12%', direction: 'up' },
  },
}

export const WithTrendDown: Story = {
  args: {
    label: 'Pending',
    value: 18,
    icon: CheckCircle,
    trend: { value: '-3%', direction: 'down' },
  },
}
