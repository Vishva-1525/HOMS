import type { Preview } from '@storybook/react-vite'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: 'page',
      values: [
        { name: 'page', value: '#F5F7FA' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
  },
}

export default preview
