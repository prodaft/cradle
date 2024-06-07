import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileInput from './FileInput';

describe('FileInput', () => {
    test('renders without errors', () => {
        render(<FileInput />);
        // Assert that the component renders without throwing any errors
        expect(screen.getByLabelText(/file input/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    test('displays an alert when no files are selected', () => {
        render(<FileInput />);
        const uploadButton = screen.getByRole('button', { name: /upload/i });

        fireEvent.click(uploadButton);

        const alert = screen.queryByTestId('dismissable-alert');
        expect(alert).toHaveTextContent('No files selected.');
        expect(alert).toHaveStyle({ backgroundColor: 'red' });
    });

    test('uploads files successfully', async () => {
        // Mock the uploadFile function
        const mockUploadFile = jest.fn().mockResolvedValue();

        // Render the component with the mocked uploadFile function
        render(<FileInput />, {
            fileUploadService: {
                uploadFile: mockUploadFile,
            },
        });

        // Select a file
        const file = new File(['test file'], 'test.txt', { type: 'text/plain' });
        const fileInput = screen.getByLabelText(/file input/i);
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Click the upload button
        const uploadButton = screen.getByRole('button', { name: /upload/i });
        fireEvent.click(uploadButton);

        // Assert that the uploadFile function was called with the correct arguments
        expect(mockUploadFile).toHaveBeenCalledWith(expect.anything(), file);

        // Assert that the pending files are cleared and a success alert is displayed
        await screen.findByText(/all files uploaded successfully/i);
        expect(fileInput.files).toHaveLength(0);
        expect(screen.queryByTestId('dismissable-alert')).not.toBeInTheDocument();
    });
});
