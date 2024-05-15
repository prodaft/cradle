/**
 * @jest-environment jsdom
 */
import { saveNote } from "./textEditorService";
import axios from 'axios';

jest.mock('axios');

const text = "Testing textEditorService"

const headers = {
    // 'Authorization': 'Bearer placeholder',
    'Content-Type': 'application/json'
}

describe('saveNote', () => {
    test('send POST request with expected text', async () => {
        axios.post.mockResolvedValueOnce();
    
        await saveNote(text);
    
        // TODO
    });
    
    test('error on request fail', async () => {
        axios.post.mockRejectedValueOnce(new Error('404 NOT FOUND'));
    
        console.error = jest.fn();
    
        await saveNote(text);
    
        // TODO
    });
})
