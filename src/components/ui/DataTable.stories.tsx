import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataTable } from './DataTable'
import { StatusBadge } from './StatusBadge'

const meta = {
  title: 'UI/DataTable',
  component: DataTable,
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

const columns = [
  { header: 'Student', accessor: 'student' as const, skeletonClassName: 'w-20' },
  { header: 'Type', accessor: 'type' as const, skeletonClassName: 'w-24' },
  {
    header: 'Status',
    accessor: 'status' as const,
    skeletonClassName: 'w-16',
    render: (row: { status: string }) => <StatusBadge status="pending" label={row.status} />,
  },
]

const data = [
  { student: '21CS001', type: 'Outpass', status: 'Pending' },
  { student: '21CS014', type: 'Staypass', status: 'Approved' },
]

export const WithData: Story = {
  args: { columns, data, getRowKey: (_row, i) => i },
}

export const Loading: Story = {
  args: { columns, data: [], loading: true },
}

export const Empty: Story = {
  args: { columns, data: [], emptyMessage: 'No requests found.' },
}
