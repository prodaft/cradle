import { useTheme } from '@contexts/ui';
import { JSX, useEffect, useState } from 'react';

import logo_dark from '@/assets/logos/dark_notext.svg';
import logo_light from '@/assets/logos/light_notext.svg';

import text_logo_dark from '@/assets/logos/dark.svg';
import text_logo_light from '@/assets/logos/light.svg';

/**
 * Logo component props
 */
export interface LogoProps {
    /** Width of the logo */
    width?: string | number;
    /** Height of the logo */
    height?: string | number;
    /** Whether to show text logo variant */
    text?: boolean;
    /** Optional click handler */
    onClick?: ((e: React.MouseEvent<HTMLImageElement>) => void) | null;
}

/**
 * The Logo component displays the CRADLE logo with theme-aware styling
 *
 * @example
 * ```tsx
 * <Logo width="200px" height="auto" text={true} />
 * <Logo onClick={handleLogoClick} />
 * ```
 */
export default function Logo({
    width = 'auto',
    height = 'auto',
    text = false,
    onClick = null,
}: LogoProps): JSX.Element {
    const { isDarkMode } = useTheme();
    const [logo, setLogo] = useState<string | null>(null);

    useEffect(() => {
        if (!isDarkMode) {
            if (text) {
                setLogo(text_logo_dark);
            } else {
                setLogo(logo_dark);
            }
        } else {
            if (text) {
                setLogo(text_logo_light);
            } else {
                setLogo(logo_light);
            }
        }
    }, [isDarkMode, text]);

    if (!logo) {
        return <div style={{ width, height }} />;
    }

    return (
        <img
            src={logo}
            alt='CRADLE'
            onClick={onClick || (() => {})}
            style={{
                width: width,
                height: height,
                cursor: onClick ? 'pointer' : 'default',
            }}
            className={onClick ? 'logo-clickable' : ''}
        />
    );
}
