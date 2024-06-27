import { createDashboardLink, truncateText } from './dashboardUtils';

describe('createDashboardLink', () => {
    it("should return '/not-found' if entity is falsy", () => {
        expect(createDashboardLink(null)).toBe('/not-found');
        expect(createDashboardLink(undefined)).toBe('/not-found');
        expect(createDashboardLink(false)).toBe('/not-found');
        expect(createDashboardLink(0)).toBe('/not-found');
        expect(createDashboardLink('')).toBe('/not-found');
    });

    it('should create a dashboard link with encoded name and type when subtype is not provided', () => {
        const entity = {
            name: 'Case A',
            type: 'case',
        };
        const expectedLink = '/dashboards/cases/Case%20A/';
        expect(createDashboardLink(entity)).toBe(expectedLink);
    });

    it('should create a dashboard link with encoded name, type, and subtype when subtype is provided', () => {
        const entity = {
            name: '127.0.0.1',
            type: 'entry',
            subtype: 'ip',
        };
        const expectedLink = '/dashboards/entries/127.0.0.1/?subtype=ip';
        expect(createDashboardLink(entity)).toBe(expectedLink);
    });
});

describe('truncateText', () => {
    it('should return the original text if it is shorter than the limit', () => {
        const text = 'Hello, world!';
        expect(truncateText(text, 20)).toBe(text);
    });

    it('should return the original text if it is equal to the limit', () => {
        const text = 'Hello, world!';
        expect(truncateText(text, text.length)).toBe(text);
    });

    it('should return the truncated text with ellipsis if it is longer than the limit', () => {
        const text = 'Hello, world!';
        const limit = 5;
        const expectedText = 'Hello...';
        expect(truncateText(text, limit)).toBe(expectedText);
    });
});
