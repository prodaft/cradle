import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import globals from "globals";


export default [
  {
    ignores : ["*out/*"]
  },
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  pluginReactConfig,
  {
    rules: {
        "no-unused-vars": 0,
        "no-undef":0
    }
  }
];