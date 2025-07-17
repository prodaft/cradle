import React from 'react';
import { useTheme } from '../../providers/ThemeProvider';
import { getThemeLogo, type ThemeType } from '../../styles/theme-config';

interface LogoProps {
  className?: string;
  alt?: string;
  theme?: ThemeType; // Optional: use specific theme logo instead of current
  text?: boolean; // Optional: use logo with text (true) or without text (false), defaults to true
}

/**
 * Logo component that automatically displays the correct logo for the current theme
 * or a specific theme if provided.
 */
export const Logo: React.FC<LogoProps> = ({
  className = '',
  alt = 'Logo',
  theme,
  text = true
}) => {
  const { getLogo } = useTheme();

  // Use provider's getLogo for current theme, or getThemeLogo for specific theme
  const logoPath = theme ? getThemeLogo(theme, text) : getLogo(text);

  return (
    <img
      src={logoPath}
      alt={alt}
      className={`theme-logo ${className}`}
    />
  );
};

/**
 * Header logo component with predefined styling
 */
export const HeaderLogo: React.FC<{ text?: boolean }> = ({ text = true }) => {
  const { getLogo } = useTheme();
  const logoPath = getLogo(text);

  return (
    <div
      className="header-logo bg-cover bg-center"
      style={{ backgroundImage: `url(${logoPath})` }}
      role="img"
      aria-label="Company Logo"
    />
  );
};

/**
 * Compact logo component - automatically uses no-text version
 * Perfect for mobile views or small spaces
 */
export const CompactLogo: React.FC<{ className?: string; theme?: ThemeType }> = ({
  className = '',
  theme
}) => {
  return (
    <Logo
      className={`compact-logo ${className}`}
      text={false}
      theme={theme}
      alt="Logo"
    />
  );
};

/**
 * Responsive logo component that shows text version on larger screens
 * and no-text version on smaller screens
 */
export const ResponsiveLogo: React.FC<{ className?: string; theme?: ThemeType }> = ({
  className = '',
  theme
}) => {
  return (
    <>
      {/* Text version for larger screens */}
      <Logo
        className={`responsive-logo-text ${className} hidden md:block`}
        text={true}
        theme={theme}
        alt="Logo"
      />
      {/* No-text version for smaller screens */}
      <Logo
        className={`responsive-logo-compact ${className} block md:hidden`}
        text={false}
        theme={theme}
        alt="Logo"
      />
    </>
  );
};
