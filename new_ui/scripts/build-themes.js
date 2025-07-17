#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import less from 'less';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const THEMES_CONFIG_PATH = path.join(PROJECT_ROOT, 'themes.json');
const THEMES_SRC_DIR = path.join(PROJECT_ROOT, 'src', 'styles', 'themes');
const THEMES_OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'themes');

// Color logging utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load themes configuration from themes.json
async function loadThemesConfig() {
  try {
    const configContent = await fs.readFile(THEMES_CONFIG_PATH, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    log(`Error loading themes config from ${THEMES_CONFIG_PATH}: ${error.message}`, 'red');
    throw error;
  }
}

// Check if a custom theme LESS file exists
async function hasCustomThemeFile(themeName) {
  try {
    const themePath = path.join(THEMES_SRC_DIR, `${themeName}.less`);
    await fs.access(themePath);
    return themePath;
  } catch {
    return null;
  }
}

// Parse LESS variables from a theme file
async function parseThemeVariables(themePath) {
  try {
    const content = await fs.readFile(themePath, 'utf8');
    const variables = {};
    
    // Extract @variable: value; lines
    const variableRegex = /@([a-zA-Z-_][a-zA-Z0-9-_]*)\s*:\s*([^;]+);/g;
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      const [, varName, value] = match;
      // Clean up the value (remove comments, trim whitespace)
      const cleanValue = value.split('//')[0].trim();
      variables[varName] = cleanValue;
    }
    
    return variables;
  } catch (error) {
    log(`Error parsing theme variables from ${themePath}: ${error.message}`, 'red');
    return {};
  }
}

// Create LESS content that imports RSuite and applies theme variables
function createThemeLessContent(variables, hasCustomTheme = false, customThemeContent = '') {
  let content = '';
  
  // Import RSuite styles
  content += '@import "rsuite/styles/index.less";\n';
  content += hasCustomTheme ? customThemeContent : '';    // Add custom theme content if it exists
  
  return content;
}

// Compile a single theme
async function compileTheme(themeName, themeConfig) {
  try {
    log(`Building ${themeName} theme...`, 'blue');
    
    // Start with variables from themes.json config
    let variables = { ...themeConfig };
    let customThemeContent = '';
    let hasCustomTheme = false;
    
    // Check if a custom LESS file exists for this theme
    const customThemePath = await hasCustomThemeFile(themeName);
    if (customThemePath) {
      log(`  Found custom theme file: ${path.basename(customThemePath)}`, 'blue');
      
      // Parse additional variables from the LESS file
      const lessVariables = await parseThemeVariables(customThemePath);
      
      // Merge variables (LESS file variables override config variables)
      variables = { ...variables, ...lessVariables };
      
      // Read the full theme file content for custom styles
      customThemeContent = await fs.readFile(customThemePath, 'utf8');
      hasCustomTheme = true;
    }
    
    if (Object.keys(variables).length === 0) {
      log(`Warning: No variables found for ${themeName} theme`, 'yellow');
    }
    
    // Create the LESS content to compile
    const lessContent = createThemeLessContent(variables, hasCustomTheme, customThemeContent);
    
    // Compile with Less
    const result = await less.render(lessContent, {
      modifyVars: variables,
      compress: process.env.NODE_ENV === 'production',
      sourceMap: process.env.NODE_ENV !== 'production' ? {
      outputSourceFiles: true
      } : undefined
    });
    
    // Ensure output directory exists
    await fs.mkdir(THEMES_OUTPUT_DIR, { recursive: true });
    
    // Write compiled CSS
    const outputPath = path.join(THEMES_OUTPUT_DIR, `${themeName}.css`);
    await fs.writeFile(outputPath, result.css);
    
    // Write source map if available
    if (result.map) {
      await fs.writeFile(`${outputPath}.map`, result.map);
    }
    
    log(`✓ ${themeName} theme built successfully!`, 'green');
    
    return {
      success: true,
      themeName,
      outputPath,
      variableCount: Object.keys(variables).length,
      hasCustomFile: hasCustomTheme
    };
    
  } catch (error) {
    log(`✗ Error building ${themeName} theme: ${error.message}`, 'red');
    if (error.line && error.column) {
      log(`  at line ${error.line}, column ${error.column}`, 'red');
    }
    return {
      success: false,
      themeName,
      error: error.message
    };
  }
}

// Main build function
async function buildThemes() {
  try {
    log('Building RSuite themes...', 'bold');
    
    // Load themes configuration
    const themesConfig = await loadThemesConfig();
    const themeNames = Object.keys(themesConfig);
    
    if (themeNames.length === 0) {
      log('No themes found in themes.json', 'yellow');
      return;
    }
    
    log(`Found ${themeNames.length} theme(s) in config: ${themeNames.join(', ')}`, 'blue');
    
    const results = [];
    
    // Build each theme
    for (const themeName of themeNames) {
      const themeConfig = themesConfig[themeName];
      const result = await compileTheme(themeName, themeConfig);
      results.push(result);
    }
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    log('\n' + '='.repeat(50), 'bold');
    log(`Build Summary:`, 'bold');
    log(`✓ Successful: ${successful.length}`, 'green');
    if (failed.length > 0) {
      log(`✗ Failed: ${failed.length}`, 'red');
      failed.forEach(f => log(`  - ${f.themeName}: ${f.error}`, 'red'));
    }
    
    if (successful.length > 0) {
      log('\nGenerated files:', 'blue');
      successful.forEach(s => {
        const relativeOutputPath = path.relative(PROJECT_ROOT, s.outputPath);
        const customFileNote = s.hasCustomFile ? ' + custom LESS' : '';
        log(`  - ${relativeOutputPath} (${s.variableCount} variables${customFileNote})`, 'blue');
      });
    }
    
    if (failed.length > 0) {
      process.exit(1);
    } else {
      log('\n✓ All RSuite themes built successfully!', 'green');
    }
    
  } catch (error) {
    log(`Fatal error during theme building: ${error.message}`, 'red');
    process.exit(1);
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  buildThemes();
}

export { buildThemes, compileTheme, loadThemesConfig, hasCustomThemeFile };
