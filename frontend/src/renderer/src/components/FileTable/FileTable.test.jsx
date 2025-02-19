/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileTable from './FileTable';
import '@testing-library/jest-dom';
import { act } from 'react';

describe('FileTable', () => {
    const fileData = [
        { minio_file_name: 'tag1', file_name: 'file1.txt', bucket_name: 'bucket1' },
        { minio_file_name: 'tag2', file_name: 'file2.txt', bucket_name: 'bucket1' },
        { minio_file_name: 'tag3', file_name: 'file3.txt', bucket_name: 'bucket1' },
    ];

    const setFileData = jest.fn();
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
        render(<FileTable fileData={fileData} setFileData={() => {}} />);

        expect(screen.getByText('Tag')).toBeInTheDocument();
        expect(screen.getByText('File Name')).toBeInTheDocument();

        fileData.forEach((file) => {
            expect(screen.getByText(file.minio_file_name)).toBeInTheDocument();
            expect(screen.getByText(file.file_name)).toBeInTheDocument();
        });
    });

    test('displays "No files uploaded yet." message when no files are provided', () => {
        render(<FileTable fileData={[]} setFileData={() => {}} />);

        expect(screen.getByText('No files uploaded yet.')).toBeInTheDocument();
    });

    test('checks the contents of the clipboard after clicking the copy button', async () => {
        render(<FileTable fileData={fileData} setFileData={() => {}} />);

        act(() => fireEvent.click(screen.getByTestId('copy-0')));

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('[file1.txt][tag1]');
    });

    test('calls handleDelete function when delete button is clicked', () => {
        const copyFiles = Array.from(fileData);
        render(<FileTable fileData={fileData} setFileData={setFileData} />);

        fileData.forEach((_, index) => {
            act(() => fireEvent.click(screen.getByTestId(`delete-${index}`)));
            copyFiles.splice(0, 1);
            expect(setFileData).toHaveBeenCalledWith(
                expect.not.arrayContaining([fileData[index]]),
            );
        });
    });
});
