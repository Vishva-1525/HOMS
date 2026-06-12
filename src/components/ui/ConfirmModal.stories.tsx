import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { ConfirmModal } from './ConfirmModal'

const meta = {
  title: 'UI/ConfirmModal',
  component: ConfirmModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmModal>

export default meta
type Story = StoryObj<typeof meta>

function ModalDemo({ variant }: { variant: 'default' | 'danger' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <ConfirmModal
        open={open}
        title={variant === 'danger' ? 'Reject request?' : 'Approve request?'}
        description={
          variant === 'danger'
            ? 'This cannot be undone. The student will be notified.'
            : 'The student will receive their QR pass.'
        }
        variant={variant}
        confirmLabel={variant === 'danger' ? 'Reject' : 'Approve'}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}

export const Default: Story = {
  render: () => <ModalDemo variant="default" />,
}

export const Danger: Story = {
  render: () => <ModalDemo variant="danger" />,
}
