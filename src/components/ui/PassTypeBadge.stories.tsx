import type { Meta, StoryObj } from '@storybook/react-vite'
import { PassTypeBadge } from './PassTypeBadge'

const meta = {
  title: 'UI/PassTypeBadge',
  component: PassTypeBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof PassTypeBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Outpass: Story = { args: { type: 'outpass' } }
export const Staypass: Story = { args: { type: 'staypass' } }
export const NightPass: Story = { args: { type: 'night_pass' } }

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <PassTypeBadge type="outpass" />
      <PassTypeBadge type="staypass" />
      <PassTypeBadge type="night_pass" />
    </div>
  ),
}
