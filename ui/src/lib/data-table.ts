import {
    type Column,
    type ColumnDef,
    columnFilteringFeature,
    columnPinningFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    metaHelper,
    type ReactTable,
    type Row,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

interface DataTableColumnMeta {
    label?: string;
}

/**
 * Feature set shared by every table rendered through `DataTable`.
 * Covers what the shared header, toolbar, pagination, and pinning helpers call.
 */
export const dataTableFeatures = tableFeatures({
    columnFilteringFeature,
    columnPinningFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableInstance<TData extends object> = ReactTable<
    DataTableFeatures,
    TData
>;
export type DataTableColumn<TData extends object, TValue = unknown> = Column<
    DataTableFeatures,
    TData,
    TValue
>;
export type DataTableColumnDef<TData extends object, TValue = unknown> = ColumnDef<
    DataTableFeatures,
    TData,
    TValue
>;
export type DataTableRow<TData extends object> = Row<DataTableFeatures, TData>;

export function getCommonPinningStyles<TData extends object>({
    column,
}: {
    column: DataTableColumn<TData>;
}): React.CSSProperties {
    const isPinned = column.getIsPinned();

    return {
        insetInlineStart:
            isPinned === 'start' ? `${column.getStart('start')}px` : undefined,
        insetInlineEnd: isPinned === 'end' ? `${column.getAfter('end')}px` : undefined,
        opacity: isPinned ? 0.97 : 1,
        position: isPinned ? 'sticky' : 'relative',
        background: isPinned ? 'var(--background)' : 'var(--background)',
        width: column.getSize(),
        zIndex: isPinned ? 1 : undefined,
    };
}
