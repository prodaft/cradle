/**
 * @jest-environment jsdom
 */
import marked from "./customParser";

// const baseUrl = 'https://localhost:8000'
const baseUrl = '';

describe("renderer", () => {
    test('parse actor links no alias', () => {
        const name = 'John Doe';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is an actor link: [[actor:${name}]]`;
        const actorUrl = `${baseUrl}/dashboards/actors/${encodedName}`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(actorUrl);
        expect(parsedHtml).toContain(name);
    });

    test('parse actor links alias', () => {
        const markdown = 'This is an actor link: [[actor:John Doe|JD]]';
        const expectedHtml = `${baseUrl}/dashboards/actors/John%20Doe`;
        const parsedHtml = marked.parse(markdown);
        expect(parsedHtml).toContain(expectedHtml);
    });

    test('parse case links no alias', () => {
        const name = 'Case 123';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is a case link: [[case:${name}]]`;
        const caseUrl = `${baseUrl}/dashboards/cases/${encodedName}`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(caseUrl);
        expect(parsedHtml).toContain(name);
    });

    test('parse case links alias', () => {
        const name = 'Case 123';
        const encodedName = encodeURIComponent(name);
        const alias = 'Super Special Secret Case';

        const markdown = `This is a case link: [[case:${name}|${alias}]]`;
        const caseUrl = `${baseUrl}/dashboards/cases/${encodedName}`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(caseUrl);
        expect(parsedHtml).toContain(alias);
    });

    test('parse entry links no alias', () => {
        const type = 'ip';
        const encodedType = encodeURIComponent(type);
        const name = '127.0.0.1';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is an entry link: [[${type}:${name}]]`;
        const entryUrl = `${baseUrl}/dashboards/entries/${encodedName}?subtype=${encodedType}`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(entryUrl);
        expect(parsedHtml).toContain(name);
    });

    test('parse entry links alias', () => {
        const type = 'ip';
        const encodedType = encodeURIComponent(type);
        const name = '127.0.0.1';
        const encodedName = encodeURIComponent(name);
        const alias = 'localhost';

        const markdown = `This is an entry link: [[${type}:${name}|${alias}]]`;
        const entryUrl = `${baseUrl}/dashboards/entries/${encodedName}?subtype=${encodedType}`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(entryUrl);
        expect(parsedHtml).toContain(alias);
    });

    test('parse metadata no alias', () => {
        const type = 'country';
        const encodedType = encodeURIComponent(type);
        const name = 'Netherlands';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is metadata: [[${type}:${name}]]`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(name);
    });

    test('parse metadata alias', () => {
        const type = 'country';
        const encodedType = encodeURIComponent(type);
        const name = 'Netherlands';
        const encodedName = encodeURIComponent(name);
        const alias = 'Holland';

        const markdown = `This is metadata: [[${type}:${name}|${alias}]]`;
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(alias);
        expect(parsedHtml).not.toContain(name);
    });

    test('ignores invalid entry types', () => {
        const markdown = 'This string should still be visible [[invalid:entry]]';
        const parsedHtml = marked.parse(markdown);

        expect(parsedHtml).toContain(markdown);
    });

    test('parse multiple', () => {
        const markdown = `Metadata: [[country:Germany]],
        Actor: [[actor:John Doe]],
        Case: [[case:Case123]],
        Entry: [[ip:127.0.0.1]]`;

        const parsedHtml = marked.parse(markdown);
        const actorUrl = `${baseUrl}/dashboards/actors/John%20Doe`;
        const caseUrl = `${baseUrl}/dashboards/cases/Case123`;
        const entryUrl = `${baseUrl}/dashboards/entries/127.0.0.1?subtype=ip`;
        
        expect(parsedHtml).toContain('Germany');
        expect(parsedHtml).not.toContain('country');
        expect(parsedHtml).toContain(actorUrl);
        expect(parsedHtml).toContain(caseUrl);
        expect(parsedHtml).toContain(entryUrl);
    });

})