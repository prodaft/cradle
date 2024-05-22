/**
 * @jest-environment jsdom
 */
import { handleLinkClick } from './textEditorUtils';

describe('handleLinkClick', () => {
    const externalLink = 'https://example.com';
    const relativeLocalPath = '/notes';

    test('local links', () => {
        const handler = jest.fn();
        const event = { target: { tagName: 'A', href: `${window.location.origin}${relativeLocalPath}` }, preventDefault: jest.fn() };

        handleLinkClick(handler)(event);

        expect(handler).toHaveBeenCalledWith('/notes');
        expect(event.preventDefault).toHaveBeenCalled();
    });

    test('external links open in a new tab', () => {
        const handler = jest.fn();
        const openMock = jest.fn();
        window.open = openMock;
        const event = { target: { tagName: 'A', href: externalLink }, preventDefault: jest.fn() };

        handleLinkClick(handler)(event);

        expect(openMock).toHaveBeenCalledWith('https://example.com', '_blank');
        expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should not handle non-link elements', () => {
        const handler = jest.fn();
        const event = { target: { tagName: 'DIV', href: `${window.location.origin}${relativeLocalPath}` }, preventDefault: jest.fn() };

        handleLinkClick(handler)(event);

        expect(handler).not.toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});
