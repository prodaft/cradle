import React from 'react';
import { useTheme } from '../../hooks/useTheme/useTheme';

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
export default function Logo({ width = 'auto', height = 'auto', text = false }) {
    const { isDarkMode, toggleTheme } = useTheme();
    let logo = null;

    if (!isDarkMode) {
        if (text) {
            logo = text_logo_dark;
        } else {
            logo = logo_dark;
        }
    } else {
        if (text) {
            logo = text_logo_light;
        } else {
            logo = logo_light;
        }
    }

    return <img src={logo} alt='CRADLE' style={{ width: width, height: height }} />;
}
