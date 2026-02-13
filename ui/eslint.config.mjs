import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginImport from 'eslint-plugin-import';
import globals from 'globals';

export default [
    {
        ignores: ['*out/*', 'node_modules/*', 'docs/*', 'src/services/**'],
    },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReactConfig,
    {
        plugins: {
            'react-hooks': pluginReactHooks,
            import: pluginImport,
        },
        rules: {
            // --- Unused code detection ---
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],

            // --- React hooks ---
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // --- Import hygiene ---
            'no-duplicate-imports': 'warn',

            // --- Code quality ---
            eqeqeq: ['warn', 'always', { null: 'ignore' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'warn',

            // --- TypeScript (relax noisy rules) ---
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',

            // --- React (relax for modern JSX transform) ---
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'react/no-unknown-property': 'off',

            // --- Disabled (handled by TypeScript) ---
            'no-undef': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
];
