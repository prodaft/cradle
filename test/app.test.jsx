/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, userEvent, screen} from '@testing-library/react'
import App from '../src/renderer/src/App.jsx';
import '@testing-library/jest-dom'
import { fetchNumber, updateNumber } from '../src/renderer/src/services/apiService.js';


jest.mock('../src/renderer/src/services/apiService.js', () => {
    return {
        fetchNumber: () => 1,
        updateNumber: () => undefined
    }
});

test('test initial', async () => {
    render(<App />);

    const count = await screen.findByText('count is 1');

    expect(count).toBeInTheDocument();
});