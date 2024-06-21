import React from 'react';
import logo from '../../assets/logo-nobg.png';

/**
 * The Logo component is a simple component that displays the CRADLE logo.
 *
 * @param {Object} props
 * @param {string} [props.width] - the width of the logo
 * @param {string} [props.height] - the height of the logo
 * @returns {Logo}
 * @constructor
 */
export default function Logo({ width = 'auto', height = 'auto' }) {
    return (
        <div>
            <img src={logo} alt='CRADLE' style={{ width: width, height: height }} />
        </div>
    );
}
