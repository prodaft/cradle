/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, userEvent, screen} from '@testing-library/react'
import App from '../renderer/src/App.jsx';
import axios from 'axios';
import '@testing-library/jest-dom'

jest.mock('axios');

test('test initial request', async () => {
    // Mock response data to match the structure of the actual response
    axios.get.mockResolvedValue({ data: [{ id: 1, value: 1 }] });

    render(<App />);

    // Find the text corresponding to the value rendered in the component
    const count = await screen.findByText('count is 1');

    expect(count).toBeInTheDocument();
});