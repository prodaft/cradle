import type { RowData } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- mirrors TanStack `ColumnMeta` generics for module augmentation
    interface ColumnMeta<TData extends RowData, TValue> {
        label?: string;
    }
}
