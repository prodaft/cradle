/**
 * @jest-environment jsdom
 */
import { handleLinkClick, createDownloadPath } from './textEditorUtils';

global.URL.canParse = jest.fn(() => true);

describe('handleLinkClick', () => {
    const externalLink = 'https://example.com';
    const relativeLocalPath = '/notes';

    test('local links', () => {
        const handler = jest.fn();
        const event = {
            target: {
                tagName: 'A',
                href: `${window.location.origin}${relativeLocalPath}`,
                dataset: { customHref: relativeLocalPath },
            },
            preventDefault: jest.fn(),
        };

        handleLinkClick(handler)(event);

        expect(handler).toHaveBeenCalledWith('/notes');
        expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should not handle non-link elements', () => {
        const handler = jest.fn();
        const event = {
            target: {
                tagName: 'DIV',
                href: `${window.location.origin}${relativeLocalPath}`,
                dataset: { customHref: relativeLocalPath },
            },
            preventDefault: jest.fn(),
        };

        handleLinkClick(handler)(event);

        expect(handler).not.toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});

test('createDownloadPath returns the correct download link', () => {
    const file = { tag: 'file.txt', bucket: 'admin1234' };

    const result = createDownloadPath(file);

    expect(result).toMatch(
        /.*\/file-transfer\/download\?bucketName=admin1234&minioFileName=file.txt/,
    );
});

test('createDownloadPath handles special characters in file name', () => {
    const file = { tag: 'file with spaces.txt', bucket: 'admin1234' };

    const result = createDownloadPath(file);

    expect(result).toMatch(
        /.*\/file-transfer\/download\?bucketName=admin1234&minioFileName=file%20with%20spaces.txt/,
    );
});

test('createDownloadPath handles special characters in bucket name', () => {
    const file = { tag: 'file.txt', bucket: 'admin@1234' };

    const result = createDownloadPath(file);

    expect(result).toMatch(
        /.*\/file-transfer\/download\?bucketName=admin%401234&minioFileName=file.txt/,
    );
});
