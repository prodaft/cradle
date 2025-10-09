import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';

import logo_dark from '../../assets/logos/dark_notext.svg';
import logo_light from '../../assets/logos/light_notext.svg';

import text_logo_dark from '../../assets/logos/dark.svg';
import text_logo_light from '../../assets/logos/light.svg';

/**
 * The Logo component is a simple component that displays the CRADLE logo.
 *
 * @function Logo
 * @param {Object} props
 * @param {string} [props.width='auto'] - the width of the logo
 * @param {string} [props.height='auto'] - the height of the logo
 * @returns {Logo}
 * @constructor
 */
export default function Logo({
    width = 'auto',
    height = 'auto',
    text = false,
    onClick = null,
}) {
    const { isDarkMode, toggleTheme } = useTheme();
    const [logo, setLogo] = useState(null);

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

    return (
        <img
            src={logo}
            alt='CRADLE'
            onClick={onClick || ((e) => {})}
            style={{
                width: width,
                height: height,
                cursor: onClick ? 'pointer' : 'default',
            }}
            className={onClick ? 'logo-clickable' : ''}
        />
    );
}
