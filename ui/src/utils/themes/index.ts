import type { ThemeConfig } from '@/types/index';
import { ayuDark, ayuLight, ayuMirage } from './ayu';
import {
    catppuccinFrappe,
    catppuccinLatte,
    catppuccinMacchiato,
    catppuccinMocha,
} from './catppuccin';
import { celestial } from './celestial';
import { cradleDark, cradleLight } from './cradle';
import { darkTheme } from './dark';
import { dracula } from './dracula';
import { gruvboxDark, gruvboxLight } from './gruvbox';
import { lightTheme } from './light';
import { solarizedDark, solarizedLight } from './solarized';
import { vscodeDark, vscodeLight } from './vscode';

interface PresetTheme {
    id: string;
    label: string;
    theme: ThemeConfig;
}

export const PRESET_THEMES: PresetTheme[] = [
    // Default themes
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
    // Cradle themes
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
    // VS Code themes
    {
        id: 'vscode-dark',
        label: 'VS Code Dark+',
        theme: vscodeDark,
    },
    {
        id: 'vscode-light',
        label: 'VS Code Light+',
        theme: vscodeLight,
    },
    // Ayu themes
    {
        id: 'ayu-dark',
        label: 'Ayu Dark',
        theme: ayuDark,
    },
    {
        id: 'ayu-light',
        label: 'Ayu Light',
        theme: ayuLight,
    },
    {
        id: 'ayu-mirage',
        label: 'Ayu Mirage',
        theme: ayuMirage,
    },
    // Dracula
    {
        id: 'dracula',
        label: 'Dracula',
        theme: dracula,
    },
    // Celestial
    {
        id: 'celestial',
        label: 'Celestial',
        theme: celestial,
    },
    // Solarized
    {
        id: 'solarized-light',
        label: 'Solarized Light',
        theme: solarizedLight,
    },
    {
        id: 'solarized-dark',
        label: 'Solarized Dark',
        theme: solarizedDark,
    },
    // Gruvbox
    {
        id: 'gruvbox-dark',
        label: 'Gruvbox Dark',
        theme: gruvboxDark,
    },
    {
        id: 'gruvbox-light',
        label: 'Gruvbox Light',
        theme: gruvboxLight,
    },
    // Catppuccin themes
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

const defaultPresetCandidate = PRESET_THEMES[0];
if (defaultPresetCandidate === undefined) {
    throw new Error('PRESET_THEMES must contain at least one preset');
}
export const DEFAULT_PRESET: PresetTheme = defaultPresetCandidate;

export { darkTheme, lightTheme };
