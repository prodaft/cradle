/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileTable from './FileTable';
import '@testing-library/jest-dom';

describe('FileTable', () => {
    const files = [
        { tag: 'tag1', name: 'file1.txt' },
        { tag: 'tag2', name: 'file2.txt' },
        { tag: 'tag3', name: 'file3.txt' },
    ];

    const setFiles = jest.fn();
    const writeText = jest.fn();
    Object.assign(navigator, {
        clipboard: {
            writeText,
        },
    });

    beforeAll(() => {
        navigator.clipboard.writeText.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders table with files', () => {
        render(<FileTable files={files} setFiles={() => {}} />);

        expect(screen.getByText('Tag')).toBeInTheDocument();
        expect(screen.getByText('Filename')).toBeInTheDocument();

        files.forEach((file) => {
            expect(screen.getByText(file.tag)).toBeInTheDocument();
            expect(screen.getByText(file.name)).toBeInTheDocument();
        });
    });

    test('displays "No files uploaded yet." message when no files are provided', () => {
        render(<FileTable files={[]} setFiles={() => {}} />);

        expect(screen.getByText('No files uploaded yet.')).toBeInTheDocument();
    });

    test('checks the contents of the clipboard after clicking the copy button', async () => {
        render(<FileTable files={files} setFiles={() => {}} />);

        fireEvent.click(screen.getByTestId('copy-0'));

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('[file1.txt][tag1]');
    });

    test('calls handleDelete function when delete button is clicked', () => {
        const copyFiles = files;
        render(<FileTable files={files} setFiles={setFiles} />);

        files.map((_, index) => {
            fireEvent.click(screen.getByTestId(`delete-${index}`));
            copyFiles.splice(0, 1);
            expect(setFiles).toHaveBeenCalledWith(copyFiles);
        });
    });
});
