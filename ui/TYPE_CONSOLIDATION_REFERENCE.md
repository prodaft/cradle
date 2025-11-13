# Type Consolidation Quick Reference

## Type Duplication Matrix

| Custom Type | Location 1 | Location 2 | Location 3 | Generated Model | Status |
|---|---|---|---|---|---|
| FileData | types.ts:44-51 | utils/editor/textEditor.ts:15-19 | - | FileReference | DUPLICATE |
| GraphNode | types.ts:107-134 | types/index.ts:180-185 | utils/graph.ts:25-42 | SubGraph (partial) | DUPLICATE x3 |
| GraphEntry | types.ts:83-92 | utils/graph.ts:10-15 | - | Entry/Entity | DUPLICATE |
| GraphLink | types.ts:97-102 | utils/graph.ts:47-50 | - | SubGraph (partial) | DUPLICATE |
| Note | types.ts:56-65 | - | - | NoteRetrieve | PARTIAL MATCH |
| Alert | types.ts:14-21 | utils/api.ts:43-47 | - | - | DUPLICATE |
| User | types/index.ts:30-35 | contexts/user/ProfileContext.tsx | - | UserRetrieve | OVERLAP |
| Profile | types/index.ts:37-43 | contexts/user/ProfileContext.tsx:14-17 | - | UserRetrieve | OVERLAP |

## Migration Priority Matrix

| Priority | Type | Custom Location | Generated Model | Effort | Impact | Risk |
|---|---|---|---|---|---|---|
| HIGH | FileData | types.ts, textEditor.ts | FileReference | Low | High | Low |
| HIGH | Note | types.ts | NoteRetrieve/NoteCreateRequest/NoteEditRequest | Medium | Very High | Medium |
| HIGH | DashboardEntry | types.ts | Entity | Medium | High | Medium |
| HIGH | GraphEntry | types.ts, graph.ts | Entry | Medium | High | Medium |
| MEDIUM | User/Profile | types/index.ts | UserRetrieve | Medium | Medium | Low-Medium |
| MEDIUM | GraphNode (D3) | graph.ts | SubGraph + custom D3 props | Medium | Medium | Medium |
| MEDIUM | Enrichment | - | EnrichmentRequest/Settings | Low | Medium | Low |
| LOW | Alert | types.ts, api.ts | - | Low | Low | Low |

## Field Mapping Examples

### FileData → FileReference

| Custom (FileData) | Generated (FileReference) | Notes |
|---|---|---|
| minio_file_name | minioFileName | camelCase conversion |
| file_name | fileName | camelCase conversion |
| bucket_name | bucketName | camelCase conversion |
| - | id | NEW: optional |
| - | timestamp | NEW: optional readonly |

### Note → NoteRetrieve (for display)

| Custom (Note) | Generated (NoteRetrieve) | Notes |
|---|---|---|
| id | id | optional readonly in generated |
| content | content | required in both |
| files: FileData[] | files: FileReferenceWithNote[] | Type change needed |
| publishable | - | NOT in generated model |
| - | author | NEW: required |
| - | editor | NEW: required |
| - | status | NEW: optional |
| - | metadata | NEW: optional |

### Note → NoteCreateRequest (for creation)

| Custom (Note) | Generated (NoteCreateRequest) | Notes |
|---|---|---|
| - | id | NO id in request |
| content | content | required in both |
| - | title | optional in request |
| - | description | optional in request |
| files | - | File upload separate |
| publishable | - | NOT in request model |

## Type Usage Patterns

### Components Using Duplicate Types

```typescript
// HIGH PRIORITY - FileData usage in components
- src/renderer/src/components/files/*
- src/renderer/src/components/notes/*
- src/renderer/src/utils/editor/textEditor.ts (defines FileData)

// HIGH PRIORITY - Note usage in components  
- src/renderer/src/components/notes/Note.tsx
- src/renderer/src/components/notes/NoteViewer.tsx
- src/renderer/src/components/dashboard/Notes.jsx
- src/renderer/src/components/documents/Notes.jsx

// HIGH PRIORITY - GraphEntry/GraphNode usage
- src/renderer/src/components/graph/Graph.jsx
- src/renderer/src/components/graph/GraphExplorer.jsx
- src/renderer/src/utils/graph.ts
- src/renderer/src/components/graph/graphFilterUtils.ts

// MEDIUM PRIORITY - User/Profile usage
- src/renderer/src/contexts/user/ProfileContext.tsx
- src/renderer/src/hooks/auth/useProfile.ts
- src/renderer/src/components/auth/AuthProvider.tsx
```

## Import Path Changes

### FileData Consolidation

```typescript
// BEFORE (multiple sources)
import { FileData } from '@/types';
// OR
import { FileData } from '@/utils/editor/textEditor';

// AFTER (single source)
import { FileReference } from '@/services/cradle/models';

// Re-export for backward compatibility (optional)
// In types.ts: export type FileData = FileReference;
```

### Note Type Consolidation

```typescript
// BEFORE
import { Note } from '@/types';

// AFTER (context-dependent)
import { NoteRetrieve } from '@/services/cradle/models'; // for display
import { NoteCreateRequest } from '@/services/cradle/models'; // for forms
import { NoteEditRequest } from '@/services/cradle/models'; // for updates
```

### User/Profile Consolidation

```typescript
// BEFORE
import { User, Profile } from '@/types/index';

// AFTER
import { UserRetrieve } from '@/services/cradle/models';

// Extend with app-specific fields if needed
interface ExtendedProfile extends UserRetrieve {
  defaultNoteTemplate?: string;
  role?: string;
}
```

## Generated Model Features Available

### Type Guards (Runtime Validation)

```typescript
// Available in every generated model
if (instanceOfNoteRetrieve(someObject)) {
  // someObject is guaranteed to be NoteRetrieve type
  console.log(someObject.content);
}
```

### Serialization Functions

```typescript
// Automatic JSON handling
const noteFromAPI = NoteRetrieveFromJSON(jsonData);
const jsonToSend = NoteRetrieveToJSON(noteObject);

// Handles snake_case ↔ camelCase conversion
// Handles Date serialization
// Handles optional/readonly fields
```

## Readonly Field Handling

### Issue
Generated models mark computed fields as readonly:

```typescript
export interface FileReference {
  id?: string;              // readonly in generated
  minioFileName: string;
  fileName: string;
  bucketName: string;
  readonly timestamp?: Date; // explicitly readonly
}
```

### Solution
Don't assign to readonly fields:

```typescript
// DON'T do this:
file.id = '123'; // TypeScript error!

// DO this instead:
const file: FileReference = {
  minioFileName: 'file.pdf',
  fileName: 'document.pdf',
  bucketName: 'uploads',
  // id and timestamp come from server
};
```

## Naming Convention Conversion

### camelCase → snake_case (serialization)

```typescript
// Generated property → JSON key
minioFileName → minio_file_name
fileName → file_name
bucketName → bucket_name
createdAt → created_at
statusMessage → status_message
editTimestamp → edit_timestamp
```

The serialization functions handle this automatically via:
- `*FromJSON()` - JSON (snake_case) → TypeScript object (camelCase)
- `*ToJSON()` - TypeScript object (camelCase) → JSON (snake_case)

## Context-Specific Types to Keep

```typescript
// KEEP: Context Values
ModalData, ModalContextValue
TabContextValue, Tab
LayoutContextValue (with internal PaneNode, SplitNode, LayoutNode)
ThemeContextValue
ApiContextValue

// KEEP: Form & Validation
FormState<T>, FormValidationError
FormSubmitOptions, UseFormValidationReturn

// KEEP: UI Utilities
Notification, NotificationType
BaseComponentProps
Theme, ThemeContextValue

// KEEP: Specialized Utilities
ParsedAPIError, HandleAPIErrorOptions
Graph D3 properties (x, y, vx, vy, fx, fy with Set<> for neighbors)
StateSetter<T>
```

## Testing Checklist for Each Migration

```
□ Type imports updated in all files
□ Type exports updated in index files
□ Serialization functions tested (JSON round-trip)
□ readonly field assignments prevented
□ Type guards used for runtime validation where needed
□ Components using type render correctly
□ API data flows correctly with new types
□ No TypeScript errors remain
□ No circular dependencies introduced
□ Performance tests pass (if applicable)
□ Documentation updated
□ Tests pass for affected features
```

## ESLint/TypeScript Rules to Add

```typescript
// Prevent new duplicate types
"no-restricted-imports": [
  "error",
  {
    patterns: [
      {
        group: ["@/types"],
        importNames: ["FileData"],
        message: "Use FileReference from @/services/cradle/models instead"
      },
      {
        group: ["@/types"],
        importNames: ["Note"],
        message: "Use NoteRetrieve/NoteCreateRequest from @/services/cradle/models"
      }
    ]
  }
]

// Ensure only generated models used for domain types
"@typescript-eslint/no-explicit-any": "error",
```

## Reference Files

| File | Purpose | Lines |
|---|---|---|
| TYPE_SYSTEM_ANALYSIS.md | Full detailed analysis | 683 |
| TYPE_CONSOLIDATION_REFERENCE.md | This file - quick reference | - |
| /types.ts | Main custom types | 135 |
| /types/index.ts | Extended custom types | 235 |
| /services/cradle/models/index.ts | Generated models exports | - |
| /services/cradle/models/FileReference.ts | Example generated model | ~100 |
| /services/cradle/models/NoteRetrieve.ts | Example generated model | ~220 |

