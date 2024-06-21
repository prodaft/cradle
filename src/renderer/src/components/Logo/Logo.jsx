import React from 'react';
import logo from '../../assets/logo-nobg.png';

export default function Logo({ width = '1.7em', height = '1.7em' }) {
    return (
        <div>
            <img src={logo} alt='CRADLE' style={{ width: width, height: height }} />
        </div>
    );
}
