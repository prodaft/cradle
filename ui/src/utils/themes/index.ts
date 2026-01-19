import type { ThemeConfig } from '@/types/index';
import { catppuccinFrappe, catppuccinLatte, catppuccinMacchiato, catppuccinMocha } from './catppuccin';
import { cradleDark, cradleLight } from './cradle';
import { darkTheme } from './dark';
import { lightTheme } from './light';

export interface PresetTheme {
    id: string;
    label: string;
    theme: ThemeConfig;
}

export const PRESET_THEMES: PresetTheme[] = [
    {
        id: 'dark',
        label: 'Dark',
        theme: darkTheme,
    },
    {
        id: 'light',
        label: 'Light',
        theme: lightTheme,
    },
    {
        id: 'cradle-dark',
        label: 'Cradle Dark',
        theme: cradleDark,
    },
    {
        id: 'cradle-light',
        label: 'Cradle Light',
        theme: cradleLight,
    },
    {
        id: 'catppuccin-latte',
        label: 'Catppuccin Latte',
        theme: catppuccinLatte,
    },
    {
        id: 'catppuccin-frappe',
        label: 'Catppuccin Frappé',
        theme: catppuccinFrappe,
    },
    {
        id: 'catppuccin-macchiato',
        label: 'Catppuccin Macchiato',
        theme: catppuccinMacchiato,
    },
    {
        id: 'catppuccin-mocha',
        label: 'Catppuccin Mocha',
        theme: catppuccinMocha,
    },
];

export {
    catppuccinFrappe,
    catppuccinLatte,
    catppuccinMacchiato,
    catppuccinMocha,
    cradleDark,
    cradleLight,
    darkTheme,
    lightTheme,
};
