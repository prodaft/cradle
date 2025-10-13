import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  ReactNode,
} from "react";

/** ---------- Types ---------- */

type PaneId = string;
type ContainerId = string;

type PaneNode = {
  type: "pane";
  id: PaneId;
};

type Orientation = "horizontal" | "vertical";

type SplitNode = {
  type: "split";
  id: ContainerId;
  orientation: Orientation;
  children: [LayoutNode, LayoutNode]; // always exactly two
  sizes: [number, number]; // percentages that sum ~100
};

type LayoutNode = PaneNode | SplitNode;

type LayoutState = {
  root: LayoutNode;
  activePaneId: PaneId;
};

type SplitPosition = "before" | "after";

/** ---------- ID Utilities ---------- */

const uid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore - TS doesn't always see it in lib
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const newPane = (): PaneNode => ({ type: "pane", id: `pane-${uid()}` });
const newSplit = (
  orientation: Orientation,
  a: LayoutNode,
  b: LayoutNode,
  sizes: [number, number] = [50, 50]
): SplitNode => ({
  type: "split",
  id: `container-${uid()}`,
  orientation,
  children: [a, b],
  sizes,
});

/** ---------- Tree Helpers (pure) ---------- */

const isPane = (n: LayoutNode): n is PaneNode => n.type === "pane";
const isSplit = (n: LayoutNode): n is SplitNode => n.type === "split";

const mapTree = (node: LayoutNode, fn: (n: LayoutNode) => LayoutNode): LayoutNode => {
  const mapped = fn(node);
  if (isSplit(mapped)) {
    return {
      ...mapped,
      children: [
        mapTree(mapped.children[0], fn),
        mapTree(mapped.children[1], fn),
      ],
    };
  }
  return mapped;
};

const findFirstPaneId = (node: LayoutNode): PaneId => {
  if (isPane(node)) return node.id;
  return findFirstPaneId(node.children[0] || node.children[1]);
};

const findNode = (node: LayoutNode, id: string): LayoutNode | null => {
  if (node.id === id) return node;
  if (isSplit(node)) {
    return (
      findNode(node.children[0], id) ||
      findNode(node.children[1], id)
    );
  }
  return null;
};

const removeNode = (node: LayoutNode, targetId: string): LayoutNode | null => {
  if (node.id === targetId) return null;
  if (!isSplit(node)) return node;

  const left = removeNode(node.children[0], targetId);
  const right = removeNode(node.children[1], targetId);

  const remaining = [left, right].filter(Boolean) as LayoutNode[];

  if (remaining.length === 2) {
    // both remain; keep split
    return { ...node, children: [remaining[0], remaining[1]] as [LayoutNode, LayoutNode] };
  }
  if (remaining.length === 1) {
    // collapse split
    return remaining[0];
  }
  // none remain
  return null;
};

const updateSizes = (
  node: LayoutNode,
  containerId: string,
  newSizes: [number, number]
): LayoutNode => {
  if (node.id === containerId && isSplit(node)) {
    const sum = Math.max(1, newSizes[0] + newSizes[1]);
    const normalized: [number, number] = [
      (newSizes[0] / sum) * 100,
      (newSizes[1] / sum) * 100,
    ];
    return { ...node, sizes: normalized };
  }
  if (isSplit(node)) {
    return {
      ...node,
      children: [
        updateSizes(node.children[0], containerId, newSizes),
        updateSizes(node.children[1], containerId, newSizes),
      ],
    };
  }
  return node;
};

const splitLeaf = (
  node: LayoutNode,
  paneId: PaneId,
  orientation: Orientation,
  position: SplitPosition
): { next: LayoutNode; newPaneId?: PaneId } => {
  if (isPane(node) && node.id === paneId) {
    const original = node;
    const created = newPane();
    const children =
      position === "before" ? [created, original] : [original, created];
    const splitNode = newSplit(orientation, children[0], children[1]);
    return { next: splitNode, newPaneId: created.id };
  }
  if (!isSplit(node)) return { next: node };
  const left = splitLeaf(node.children[0], paneId, orientation, position);
  const right =
    left.newPaneId
      ? { next: node.children[1] } // already split on left branch
      : splitLeaf(node.children[1], paneId, orientation, position);

  const nextSplit: SplitNode = {
    ...node,
    children: [left.next, right.next],
  };

  return {
    next: nextSplit,
    newPaneId: left.newPaneId ?? right.newPaneId,
  };
};

/** ---------- Actions / Reducer ---------- */

type Action =
  | { type: "SPLIT_PANE"; paneId: PaneId; orientation: Orientation; position: SplitPosition }
  | { type: "CLOSE_PANE"; paneId: PaneId }
  | { type: "UPDATE_SIZES"; containerId: ContainerId; sizes: [number, number] }
  | { type: "SET_ACTIVE"; paneId: PaneId };

const reducer = (state: LayoutState, action: Action): LayoutState => {
  switch (action.type) {
    case "SPLIT_PANE": {
      const { paneId, orientation, position } = action;
      const exists = findNode(state.root, paneId);
      if (!exists || !isPane(exists)) return state; // guard: only split leaves
      const { next, newPaneId } = splitLeaf(state.root, paneId, orientation, position);
      return {
        root: next,
        activePaneId: newPaneId ?? state.activePaneId,
      };
    }
    case "CLOSE_PANE": {
      // Don't close if it's the only pane
      if (isPane(state.root) && state.root.id === action.paneId) return state;

      const nextRoot = removeNode(state.root, action.paneId) ?? newPane();
      const stillExists = findNode(nextRoot, state.activePaneId);
      const nextActive = stillExists
        ? state.activePaneId
        : findFirstPaneId(nextRoot);

      return {
        root: nextRoot,
        activePaneId: nextActive,
      };
    }
    case "UPDATE_SIZES": {
      return { ...state, root: updateSizes(state.root, action.containerId, action.sizes) };
    }
    case "SET_ACTIVE":
      return { ...state, activePaneId: action.paneId };
    default:
      return state;
  }
};

/** ---------- Context ---------- */

type LayoutContextValue = {
  layout: LayoutNode;
  activePaneId: PaneId;
  splitPane: (paneId: PaneId, direction: Orientation, position?: SplitPosition) => { originalPaneId: PaneId; newPaneId?: PaneId };
  closePane: (paneId: PaneId) => void;
  updatePaneSizes: (containerId: ContainerId, newSizes: [number, number]) => void;
  setActivePaneId: (paneId: PaneId) => void;
  getAllPaneIds: () => PaneId[];
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export const useLayout = (): LayoutContextValue => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within a LayoutProvider");
  return ctx;
};

/** ---------- Provider ---------- */

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const initialPane = newPane();
  const [state, dispatch] = useReducer(reducer, {
    root: initialPane,
    activePaneId: initialPane.id,
  });

  const splitPane = useCallback<LayoutContextValue["splitPane"]>(
    (paneId, direction, position = "after") => {
      // Dispatch first; compute newPaneId by simulating split quickly:
      const { newPaneId } = splitLeaf(state.root, paneId, direction, position);
      dispatch({ type: "SPLIT_PANE", paneId, orientation: direction, position });
      return { originalPaneId: paneId, newPaneId };
    },
    [state.root]
  );

  const closePane = useCallback<LayoutContextValue["closePane"]>(
    (paneId) => dispatch({ type: "CLOSE_PANE", paneId }),
    []
  );

  const updatePaneSizes = useCallback<LayoutContextValue["updatePaneSizes"]>(
    (containerId, newSizes) => dispatch({ type: "UPDATE_SIZES", containerId, sizes: newSizes }),
    []
  );

  const setActivePaneId = useCallback<LayoutContextValue["setActivePaneId"]>(
    (paneId) => dispatch({ type: "SET_ACTIVE", paneId }),
    []
  );

  const getAllPaneIds = useCallback((): PaneId[] => {
    const ids: PaneId[] = [];
    const walk = (n: LayoutNode) => {
      if (isPane(n)) ids.push(n.id);
      else {
        walk(n.children[0]);
        walk(n.children[1]);
      }
    };
    walk(state.root);
    return ids;
  }, [state.root]);

  const value = useMemo<LayoutContextValue>(
    () => ({
      layout: state.root,
      activePaneId: state.activePaneId,
      splitPane,
      closePane,
      updatePaneSizes,
      setActivePaneId,
      getAllPaneIds,
    }),
    [state.root, state.activePaneId, splitPane, closePane, updatePaneSizes, getAllPaneIds]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

