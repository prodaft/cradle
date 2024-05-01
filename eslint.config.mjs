import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";


export default [
  {
    ignores : ["*out/*"]
  },
  {
    
  },
  pluginJs.configs.recommended,
  pluginReactConfig,
  {
    rules: {
        "no-unused-vars": "warn",
        "no-undef":"warn"
    }
  }
];