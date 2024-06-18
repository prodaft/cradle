import { preprocessData, entityColors, visualizeGraph } from './graphUtils';
import { describe, expect, it } from '@jest/globals';

describe('preprocessData', () => {
    it('transforms raw data into nodes and links', () => {
        const rawData = {
            entities: [
                { id: '1', name: 'Entity1', type: 'case' },
                { id: '2', name: 'Entity2', type: 'actor' },
                { id: '3', name: 'Entity3', type: 'entry' },
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
            entities: [
                { id: '1', name: 'Entity1', type: 'case' },
                { id: '2', name: 'Entity2', type: 'actor' },
                { id: '3', name: 'Entity3', type: 'entry' },
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

    it('assigns correct color based on entity type', () => {
        const rawData = {
            entities: [
                { id: '1', name: 'Entity1', type: 'case' },
                { id: '2', name: 'Entity2', type: 'actor' },
                { id: '3', name: 'Entity3', type: 'entry' },
            ],
            links: [],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1').color).toEqual(
            entityColors.case,
        );
        expect(result.nodes.find((node) => node.id === '2').color).toEqual(
            entityColors.actor,
        );
        expect(result.nodes.find((node) => node.id === '3').color).toEqual(
            entityColors.entry,
        );
    });

    it('correctly fills in the rest of the node properties', () => {
        const rawData = {
            entities: [{ id: '1', name: 'Entity1', type: 'case' }],
            links: [],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1')).toEqual({
            id: '1',
            label: 'Entity1',
            color: entityColors.case,
            name: 'Entity1',
            type: 'case',
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
            entities: [{ id: '1', name: 'Entity1', type: 'entry', subtype: 'url' }],
            links: [],
        };

        const result = preprocessData(rawData);

        expect(result.nodes.find((node) => node.id === '1')).toEqual({
            id: '1',
            label: 'url: Entity1',
            color: entityColors.entry,
            name: 'Entity1',
            type: 'entry',
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
