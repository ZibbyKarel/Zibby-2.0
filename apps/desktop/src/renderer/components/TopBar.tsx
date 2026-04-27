import React from 'react';
import {
  Button,
  Chip,
  Divider,
  Icon,
  IconButton,
  IconName,
  Kbd,
  SearchField,
  Spacer,
  Stack,
  Surface,
  Text,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import { BrandMark } from './icons';
import { UsagePanel } from './UsagePanel';

type TopBarProps = {
  theme: 'dark' | 'light';
  folderPath: string | null;
  search: string;
  tick: number;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onThemeToggle: () => void;
  onPickFolder: () => void;
};

export function TopBar({
  theme,
  folderPath,
  search,
  tick,
  onSearchChange,
  onThemeToggle,
  onPickFolder,
}: TopBarProps) {
  return (
    <Surface
      as="header"
      background="bg1"
      bordered={{ bottom: true }}
      paddingX={20}
      paddingY={14}
      data-testid={TestIds.TopBar.root}
    >
      <Stack direction="row" align="center" gap={16}>
        <Stack direction="row" align="center" gap={10} data-testid={TestIds.TopBar.brand}>
          <BrandMark theme={theme} size={30} />
          <Stack direction="column">
            <Text size="md" weight="semibold" tracking="tight">
              {theme === 'light' ? 'DayCoder' : 'NightCoder'}
            </Text>
            <Text size="xs" tone="faint" mono>multi-agent coding workflow</Text>
          </Stack>
        </Stack>

        {folderPath ? (
          <Surface background="bg2" bordered radius="sm" paddingX={10} paddingY={6}>
            <Stack direction="row" align="center" gap={6}>
              <Icon value={IconName.Folder} size="sm" />
              <Surface maxWidth={260}>
                <Text size="sm" mono tone="muted" truncate data-testid={TestIds.TopBar.folderPath}>
                  {folderPath}
                </Text>
              </Surface>
              <Divider orientation="vertical" />
              <Chip tone="accent" size="sm" icon={<Icon value={IconName.Git} size="xs" />}>main</Chip>
              <IconButton
                aria-label="Change folder"
                size="sm"
                variant="ghost"
                onClick={onPickFolder}
                icon={IconName.ChevronDown}
                data-testid={TestIds.TopBar.changeFolderBtn}
              />
            </Stack>
          </Surface>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onPickFolder}
            startIcon={IconName.Folder}
            label="Pick folder"
            data-testid={TestIds.TopBar.pickFolderBtn}
          />
        )}

        <Spacer />

        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder="Search tasks"
          startAdornment={<Icon value={IconName.Search} size="sm" />}
          endAdornment={<Kbd>⌘K</Kbd>}
          data-testid={TestIds.TopBar.searchInput}
        />

        <UsagePanel tick={tick} />

        <IconButton
          aria-label="Toggle theme"
          title="Toggle theme"
          variant="secondary"
          onClick={onThemeToggle}
          icon={theme === 'dark' ? IconName.Sun : IconName.Moon}
          data-testid={TestIds.TopBar.themeToggle}
        />
      </Stack>
    </Surface>
  );
}
