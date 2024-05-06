/**
 * @jest-environment jsdom
 */
import axios from 'axios';
import '@testing-library/jest-dom'
import { fetchNumber, updateNumber } from '../src/renderer/src/services/apiService.js';

jest.mock('axios');

test('test request', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 1, value: 1 }] });

    const spy = jest.spyOn(axios, 'get')

    const count = await fetchNumber();

    expect(count).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
});

test('test post', async () => {
    axios.post.mockResolvedValue({});

    const spy = jest.spyOn(axios, 'post')

    await updateNumber();
    
    expect(spy).toHaveBeenCalledTimes(1);
});

test('test get error', async () => {
    axios.get.mockRejectedValue(new Error('Request failed'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await fetchNumber();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching data: ',Error('Request failed'));
});

test('test post error', async () => {
    axios.post.mockRejectedValue(new Error('Request failed'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await updateNumber();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating data: ',Error('Request failed'));
});