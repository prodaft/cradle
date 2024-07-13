/**
 * @jest-environment jsdom
 */
import parseMarkdown from './customParser';

const baseUrl = '';

describe('renderer', () => {
    test('parse actor links no alias', async () => {
        const name = 'John Doe';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is an actor link: [[actor:${name}]]`;
        const actorUrl = `${baseUrl}/dashboards/actors/${encodedName}`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(actorUrl);
        expect(parsedHtml).toContain(name);
    });

    test('parse actor links alias', async () => {
        const markdown = 'This is an actor link: [[actor:John Doe|JD]]';
        const expectedHtml = `${baseUrl}/dashboards/actors/John%20Doe`;
        const parsedHtml = await parseMarkdown(markdown);
        expect(parsedHtml).toContain(expectedHtml);
    });

    test('parse entity links no alias', async () => {
        const name = 'Entity 123';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is an entity link: [[entity:${name}]]`;
        const entityUrl = `${baseUrl}/dashboards/entities/${encodedName}`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(entityUrl);
        expect(parsedHtml).toContain(name);
    });

    test('parse entity links alias', async () => {
        const name = 'Entity 123';
        const encodedName = encodeURIComponent(name);
        const alias = 'Super Special Secret Entity';

        const markdown = `This is an entity link: [[entity:${name}|${alias}]]`;
        const entityUrl = `${baseUrl}/dashboards/entities/${encodedName}`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(entityUrl);
        expect(parsedHtml).toContain(alias);
    });

    test('parse artifact links no alias', async () => {
        const type = 'ip';
        const encodedType = encodeURIComponent(type);
        const name = '127.0.0.1';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is an artifact link: [[${type}:${name}]]`;
        const artifactUrl = `${baseUrl}/dashboards/artifacts/${encodedName}/?subtype=${encodedType}`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(artifactUrl);
        expect(parsedHtml).toContain(name);
    });

    test('parse artifact links alias', async () => {
        const type = 'ip';
        const encodedType = encodeURIComponent(type);
        const name = '127.0.0.1';
        const encodedName = encodeURIComponent(name);
        const alias = 'localhost';

        const markdown = `This is an artifact link: [[${type}:${name}|${alias}]]`;
        const artifactUrl = `${baseUrl}/dashboards/artifacts/${encodedName}/?subtype=${encodedType}`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(artifactUrl);
        expect(parsedHtml).toContain(alias);
    });

    test('parse metadata no alias', async () => {
        const type = 'country';
        const encodedType = encodeURIComponent(type);
        const name = 'Netherlands';
        const encodedName = encodeURIComponent(name);

        const markdown = `This is metadata: [[${type}:${name}]]`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(name);
    });

    test('parse metadata alias', async () => {
        const type = 'country';
        const encodedType = encodeURIComponent(type);
        const name = 'Netherlands';
        const encodedName = encodeURIComponent(name);
        const alias = 'Holland';

        const markdown = `This is metadata: [[${type}:${name}|${alias}]]`;
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(alias);
        expect(parsedHtml).not.toContain(name);
    });

    test('ignores invalid artifact types', async () => {
        const markdown = 'This string should still be visible [[invalid:artifact]]';
        const parsedHtml = await parseMarkdown(markdown);

        expect(parsedHtml).toContain(markdown);
    });

    test('parse multiple', async () => {
        const markdown = `Metadata: [[country:Germany]],
        Actor: [[actor:John Doe]],
        Entity: [[entity:Entity123]],
        Artifact: [[ip:127.0.0.1]]`;

        const parsedHtml = await parseMarkdown(markdown);
        const actorUrl = `${baseUrl}/dashboards/actors/John%20Doe`;
        const entityUrl = `${baseUrl}/dashboards/entities/Entity123`;
        const artifactUrl = `${baseUrl}/dashboards/artifacts/127.0.0.1/?subtype=ip`;

        expect(parsedHtml).toContain('Germany');
        expect(parsedHtml).not.toContain('country');
        expect(parsedHtml).toContain(actorUrl);
        expect(parsedHtml).toContain(entityUrl);
        expect(parsedHtml).toContain(artifactUrl);
    });
});
