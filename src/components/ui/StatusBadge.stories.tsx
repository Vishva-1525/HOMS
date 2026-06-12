import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusBadge } from './StatusBadge'

const meta = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'approved', 'rejected', 'overdue', 'completed', 'cancelled'],
    },
  },
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = { args: { status: 'pending' } }
export const Approved: Story = { args: { status: 'approved' } }
export const Rejected: Story = { args: { status: 'rejected' } }
export const Overdue: Story = { args: { status: 'overdue' } }
export const Completed: Story = { args: { status: 'completed' } }
export const Cancelled: Story = { args: { status: 'cancelled' } }

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="pending" />
      <StatusBadge status="approved" />
      <StatusBadge status="rejected" />
      <StatusBadge status="overdue" />
      <StatusBadge status="completed" />
      <StatusBadge status="cancelled" />
    </div>
  ),
}
