import type { components, operations } from '@services/openapi/schema';

/** Non-null GET query object for an operation (from generated OpenAPI). */
export type ApiQuery<Op extends keyof operations> = NonNullable<
    operations[Op]['parameters']['query']
>;

/** `components.schemas` entry (request/response DTOs). */
export type ApiSchema<K extends keyof components['schemas']> = components['schemas'][K];
