/**
 * @jest-environment jsdom
 */
import { saveNote } from "./textEditorService";
import axios from 'axios';

jest.mock('axios');

const headers = {
    'Authorization': 'Bearer placeholder',
    'Content-Type': 'application/json'
}
const token = 'placeholder';

describe('saveNote', () => {    
    test('sends a POST request to /notes/ with the correct parameters', async () => {
        const text = "This is a note";
        const mockResponse = { data: { success: true } };

        axios.mockResolvedValue(mockResponse);

        const response = await saveNote(text, token);

        expect(axios).toHaveBeenCalledWith({
            method: "post",
            url: "/notes/",
            data: { content: text},
            headers: headers
        });

        expect(response).toEqual(mockResponse);
    });

    test('handles errors correctly', async () => {
        const text = "This is a note";
        const mockError = new Error("Network error");

        axios.mockRejectedValue(mockError);

        try {
            await saveNote(text, token);
        } catch (error) {
            expect(error).toBe(mockError);
        }

        expect(axios).toHaveBeenCalledWith({
            method: "post",
            url: "/notes/",
            data: {content: text},
            headers: headers
        });
    });
});
