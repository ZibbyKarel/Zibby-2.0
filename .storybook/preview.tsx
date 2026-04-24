import type { Preview } from '@storybook/react-vite';
import '../apps/desktop/src/renderer/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0b0d' },
        { name: 'light', value: '#f6f6f4' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Design-system theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? 'dark';
      const bg = theme === 'light' ? '#f6f6f4' : '#0a0b0d';
      return (
        <div
          className={theme === 'light' ? 'theme-light zb' : 'zb'}
          style={{ background: bg, padding: '1.5rem', minHeight: '100vh' }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
