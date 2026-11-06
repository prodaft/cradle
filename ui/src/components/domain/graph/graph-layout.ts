/**
 * Entity-centric layout: positions computed directly from the graph, so the same graph always looks the same and
 * nothing moves once drawn.
 *
 * Every entity is the centre of its own group. Every other node joins the entity it is the fewest links away from
 * (on a tie, the one most of its already grouped neighbours joined) and hangs off one of those neighbours, so each
 * group is a tree around its entity. Nodes with no path to any entity are grouped by connected piece, around the
 * piece's most linked node. Each group is drawn as rings around its centre, one ring per link distance, with every
 * node inside its parent's slice of the circle; groups that share links are placed next to each other.
 */

import type { Edge } from './graph-filter-utils';

type Point = { x: number; y: number };

interface Tree {
    /** The group (its centre's ID) of each node. */
    group: Map<string, string>;
    parent: Map<string, string>;
    depth: Map<string, number>;
}

/** Breadth-first from all `roots` at once, one link distance at a time (see the module comment for ties). */
function grow(roots: string[], neighbours: Map<string, string[]>, tree: Tree) {
    for (const id of roots) {
        tree.group.set(id, id);
        tree.depth.set(id, 0);
    }
    let frontier = roots;
    while (frontier.length > 0) {
        const votes = new Map<string, Map<string, { count: number; via: string }>>();
        for (const id of frontier) {
            const label = tree.group.get(id)!;
            for (const neighbour of neighbours.get(id) ?? []) {
                if (tree.group.has(neighbour)) continue;
                const counts = votes.get(neighbour) ?? new Map();
                const vote = counts.get(label) ?? { count: 0, via: id };
                vote.count += 1;
                counts.set(label, vote);
                votes.set(neighbour, counts);
            }
        }
        for (const [id, counts] of votes) {
            let best: [string, { count: number; via: string }] | null = null;
            for (const entry of counts) {
                if (!best || entry[1].count > best[1].count) best = entry;
            }
            const [label, { via }] = best!;
            tree.group.set(id, label);
            tree.parent.set(id, via);
            tree.depth.set(id, tree.depth.get(via)! + 1);
        }
        frontier = [...votes.keys()];
    }
}

function buildTree(
    ids: string[],
    neighbours: Map<string, string[]>,
    isEntity: (id: string) => boolean,
): Tree {
    const tree: Tree = { group: new Map(), parent: new Map(), depth: new Map() };
    grow(ids.filter(isEntity), neighbours, tree);
    const byDegree = ids
        .filter((id) => !tree.group.has(id))
        .sort(
            (a, b) =>
                (neighbours.get(b)?.length ?? 0) - (neighbours.get(a)?.length ?? 0),
        );
    for (const id of byDegree) {
        if (!tree.group.has(id)) grow([id], neighbours, tree);
    }
    return tree;
}

/**
 * Positions for every node in `ids`, in layout units. `sizeOf` is a node's radius in the same units; rings and groups
 * are spaced so that no two nodes overlap.
 */
export function entityLayout(
    ids: string[],
    links: Edge[],
    isEntity: (id: string) => boolean,
    sizeOf: (id: string) => number,
): Map<string, Point> {
    const known = new Set(ids);
    const neighbours = new Map<string, string[]>();
    for (const { source, target } of links) {
        if (source === target || !known.has(source) || !known.has(target)) continue;
        if (!neighbours.has(source)) neighbours.set(source, []);
        if (!neighbours.has(target)) neighbours.set(target, []);
        neighbours.get(source)!.push(target);
        neighbours.get(target)!.push(source);
    }
    const tree = buildTree(ids, neighbours, isEntity);

    const children = new Map<string, string[]>();
    for (const [child, parent] of tree.parent) {
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent)!.push(child);
    }
    const weight = new Map<string, number>();
    for (const id of [...ids].sort((a, b) => tree.depth.get(b)! - tree.depth.get(a)!)) {
        weight.set(
            id,
            1 +
                (children.get(id) ?? []).reduce(
                    (sum, child) => sum + weight.get(child)!,
                    0,
                ),
        );
    }
    for (const list of children.values()) {
        list.sort((a, b) => weight.get(b)! - weight.get(a)! || a.localeCompare(b));
    }

    const members = new Map<string, string[]>();
    for (const id of ids) {
        const group = tree.group.get(id)!;
        if (!members.has(group)) members.set(group, []);
        members.get(group)!.push(id);
    }

    const meanDiameter =
        (2 * ids.reduce((sum, id) => sum + sizeOf(id), 0)) / Math.max(1, ids.length);
    const gap = meanDiameter / 2;

    const slice = new Map<string, { from: number; to: number }>();
    const share = (id: string, from: number, to: number) => {
        slice.set(id, { from, to });
        const kids = children.get(id) ?? [];
        const total = kids.reduce((sum, child) => sum + weight.get(child)!, 0);
        let start = from;
        for (const child of kids) {
            const span = ((to - from) * weight.get(child)!) / total;
            share(child, start, start + span);
            start += span;
        }
    };
    const local = new Map<string, Point>();
    const groupRadius = new Map<string, number>();
    for (const [centre, list] of members) {
        share(centre, 0, 2 * Math.PI);
        const needed: number[] = [];
        const widest: number[] = [];
        for (const id of list) {
            const depth = tree.depth.get(id)!;
            const { from, to } = slice.get(id)!;
            needed[depth] = Math.max(
                needed[depth] ?? 0,
                (2 * sizeOf(id) + gap) / (to - from),
            );
            widest[depth] = Math.max(widest[depth] ?? 0, sizeOf(id));
        }
        const radius: number[] = [0];
        for (let depth = 1; depth < needed.length; depth++) {
            const step = widest[depth - 1]! + widest[depth]! + 3 * meanDiameter;
            radius[depth] = Math.max(radius[depth - 1]! + step, needed[depth]!);
        }
        groupRadius.set(
            centre,
            radius[radius.length - 1]! + widest[widest.length - 1]!,
        );
        for (const id of list) {
            const { from, to } = slice.get(id)!;
            const angle = (from + to) / 2;
            const r = radius[tree.depth.get(id)!]!;
            local.set(id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
    }

    const shared = new Map<string, Map<string, number>>();
    for (const { source, target } of links) {
        const a = tree.group.get(source);
        const b = tree.group.get(target);
        if (!a || !b || a === b) continue;
        for (const [from, to] of [
            [a, b],
            [b, a],
        ] as const) {
            const counts = shared.get(from) ?? new Map<string, number>();
            counts.set(to, (counts.get(to) ?? 0) + 1);
            shared.set(from, counts);
        }
    }
    const centres = new Map<string, Point & { r: number }>();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const order = [...members.keys()].sort(
        (a, b) => members.get(b)!.length - members.get(a)!.length || a.localeCompare(b),
    );
    for (const group of order) {
        const r = groupRadius.get(group)!;
        let target: Point = { x: 0, y: 0 };
        let total = 0;
        for (const [other, count] of shared.get(group) ?? []) {
            const placed = centres.get(other);
            if (!placed) continue;
            target = { x: target.x + placed.x * count, y: target.y + placed.y * count };
            total += count;
        }
        if (total > 0) target = { x: target.x / total, y: target.y / total };
        const step = Math.max(r, meanDiameter) / 2;
        for (let k = 0; ; k++) {
            const distance = step * Math.sqrt(k);
            const spot = {
                x: target.x + Math.cos(k * goldenAngle) * distance,
                y: target.y + Math.sin(k * goldenAngle) * distance,
            };
            let clear = true;
            for (const other of centres.values()) {
                if (
                    Math.hypot(other.x - spot.x, other.y - spot.y) <
                    other.r + r + 2 * meanDiameter
                ) {
                    clear = false;
                    break;
                }
            }
            if (clear) {
                centres.set(group, { ...spot, r });
                break;
            }
        }
    }

    const positions = new Map<string, Point>();
    for (const id of ids) {
        const centre = centres.get(tree.group.get(id)!)!;
        const offset = local.get(id)!;
        positions.set(id, { x: centre.x + offset.x, y: centre.y + offset.y });
    }
    return positions;
}
