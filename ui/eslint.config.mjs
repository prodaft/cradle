import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';

export default [
    {
        ignores: ['*out/*', 'node_modules/*', 'docs/*'],
    },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    pluginReactConfig,
    {
        rules: {
            'no-unused-vars': 0,
            'no-undef': 0,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
];
