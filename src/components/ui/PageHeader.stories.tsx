import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { PageHeader } from './PageHeader'

const meta = {
  title: 'UI/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Pending Requests',
    subtitle: 'Review and approve student outpass requests',
    actions: (
      <>
        <Button variant="secondary" size="sm">
          Export
        </Button>
        <Button size="sm">Approve selected</Button>
      </>
    ),
  },
}
