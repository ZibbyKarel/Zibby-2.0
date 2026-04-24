import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../libs/**/*.stories.@(ts|tsx|mdx)'],
  addons: [],
  async viteFinal(config) {
    const tailwindcss = (await import('@tailwindcss/vite')).default;
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    return config;
  },
};

export default config;
