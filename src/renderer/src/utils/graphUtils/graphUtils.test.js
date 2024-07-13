import { preprocessData, visualizeGraph } from './graphUtils';
import { describe, expect, it } from '@jest/globals';
import { entryGraphColors } from '../entryDefinitions/entryDefinitions';

describe('preprocessData', () => {
    it('transforms raw data into nodes and links', () => {
        const rawData = {
            entries: [
                { id: '1', name: 'Entry1', type: 'entity' },
                { id: '2', name: 'Entry2', type: 'actor' },
                { id: '3', name: 'Entry3', type: 'artifact' },
            ],
            links: [
                { source: '1', target: '2' },
                { source: '2', target: '3' },
            ],
        };

        const result = preprocessData(rawData);

        expect(result.nodes).toHaveLength(3);
        expect(result.links).toHaveLength(2);
    });

    it('calculates degree of nodes based on links', () => {
        const rawData = {
            entries: [
                { id: '1', name: 'Entry1', type: 'entity' },
                { id: '2', name: 'Entry2', type: 'actor' },
                { id: '3', name: 'Entry3', type: 'artifact' },
            ],
            links: [
                { source: '1', target: '2' },
                { source: '2', target: '3' },
            ],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1').degree).toEqual(1);
        expect(result.nodes.find((node) => node.id === '2').degree).toEqual(2);
        expect(result.nodes.find((node) => node.id === '3').degree).toEqual(1);
    });

    it('assigns correct color based on entry type', () => {
        const rawData = {
            entries: [
                { id: '1', name: 'Entry1', type: 'entity' },
                { id: '2', name: 'Entry2', type: 'actor' },
                { id: '3', name: 'Entry3', type: 'artifact' },
            ],
            links: [],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1').color).toEqual(
            entryGraphColors.entity,
        );
        expect(result.nodes.find((node) => node.id === '2').color).toEqual(
            entryGraphColors.actor,
        );
        expect(result.nodes.find((node) => node.id === '3').color).toEqual(
            entryGraphColors.artifact,
        );
    });

    it('correctly fills in the rest of the node properties', () => {
        const rawData = {
            entries: [{ id: '1', name: 'Entry1', type: 'entity' }],
            links: [],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1')).toEqual({
            id: '1',
            label: 'entity: Entry1',
            color: entryGraphColors.entity,
            name: 'Entry1',
            type: 'entity',
            subtype: undefined,
            degree: 0,
            x: expect.any(Number),
            y: expect.any(Number),
            vx: 0,
            vy: 0,
            fx: null,
            fy: null,
        });
    });

    it('correctly manages type and subtype', () => {
        const rawData = {
            entries: [{ id: '1', name: 'Entry1', type: 'artifact', subtype: 'url' }],
            links: [],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1')).toEqual({
            id: '1',
            label: 'url: Entry1',
            color: entryGraphColors.artifact,
            name: 'Entry1',
            type: 'artifact',
            subtype: 'url',
            degree: 0,
            x: expect.any(Number),
            y: expect.any(Number),
            vx: 0,
            vy: 0,
            fx: null,
            fy: null,
        });
    });
});
