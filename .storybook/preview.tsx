import type { Preview } from '@storybook/react-vite';
import { DesignSystemProvider } from '../libs/design-system/src/index';

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
      const theme = (context.globals.theme ?? 'dark') as 'dark' | 'light';
      return (
        <DesignSystemProvider theme={theme} style={{ padding: '1.5rem', minHeight: '100vh' }}>
          <Story />
        </DesignSystemProvider>
      );
    },
  ],
};

export default preview;
