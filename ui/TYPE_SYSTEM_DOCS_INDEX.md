# Type System Documentation Index

## Overview

This document serves as an index to comprehensive type system analysis completed for the Cradle UI TypeScript codebase. The analysis identifies type duplications, opportunities for consolidation, and provides a migration roadmap.

## Documents

### 1. TYPE_SYSTEM_ANALYSIS.md (24 KB, 683 lines)

**Purpose:** Comprehensive detailed analysis of the entire type system

**Key Sections:**
- **Section 1:** Current Type System Structure
  - Overview of type files (types.ts, types/index.ts, declarations.d.ts)
  - Generated API models directory (101 files)
  - Type counts and locations

- **Section 2:** Type Definitions by Location
  - Context types (27 occurrences, 9 files)
  - Hook types (10 occurrences, 7 files)
  - Component types (58 occurrences, 30+ files)
  - Utility types (33 occurrences, 9 files)

- **Section 3:** Type Duplication Analysis
  - Direct duplicates: FileData, GraphNode, GraphEntry, GraphLink, Alert, User/Profile
  - Partial overlaps: API response types, Alert variations
  - Code examples for each duplicate

- **Section 4:** Common Patterns of Type Usage
  - Component props pattern
  - Context values pattern
  - Hook return types pattern
  - Generated model usage pattern
  - Domain types pattern

- **Section 5:** Areas Where Generated Types Could Replace Custom Types
  - **High Priority:** FileData, Note, Entity/Entry
  - **Medium Priority:** User/Profile, Enrichment types
  - **Lower Priority:** Graph D3 types, API errors, Form state

- **Section 6:** Potential Conflicts and Issues
  - Naming convention mismatches (camelCase vs snake_case)
  - Optional vs required field differences
  - Readonly property handling
  - Type guard functions availability
  - Circular dependency risks
  - Serialization function patterns

- **Section 7:** Migration Strategy Recommendations
  - **Phase 1:** Foundation & Mapping (1-2 weeks)
  - **Phase 2:** High-Impact Migrations (2-4 weeks)
  - **Phase 3:** Medium-Impact Migrations (3-6 weeks)
  - **Phase 4:** Cleanup & Validation (2+ weeks)

- **Section 8:** Summary of Key Findings
  - Custom types that should remain
  - Types that should be consolidated
  - Benefits of consolidation

- **Section 9:** Files and Locations Reference
  - All type definition files
  - Generated models directory
  - Component type locations
  - Duplicate type locations

**Best For:** Understanding the full scope and details of type system issues

**Read Time:** 30-45 minutes for full document, 10 minutes for executive summary

---

### 2. TYPE_CONSOLIDATION_REFERENCE.md (12 KB, quick reference)

**Purpose:** Quick lookup tables and concrete examples for type migrations

**Contents:**

- **Type Duplication Matrix**
  Table showing all duplicates, their locations, generated equivalents, and status
  
- **Migration Priority Matrix**
  Table with priority, type, locations, generated model, effort, impact, and risk for each consolidation
  
- **Field Mapping Examples**
  - FileData → FileReference (with field conversions)
  - Note → NoteRetrieve (for display)
  - Note → NoteCreateRequest (for forms)
  
- **Type Usage Patterns**
  Which components use which duplicate types, organized by priority
  
- **Import Path Changes**
  Before/after examples for consolidations:
  - FileData consolidation
  - Note type consolidation
  - User/Profile consolidation
  
- **Generated Model Features Available**
  - Type Guard Functions (instanceOf*)
  - Serialization Functions (*FromJSON, *ToJSON)
  
- **Readonly Field Handling**
  - Issue explanation with code example
  - Solution pattern
  
- **Naming Convention Conversion**
  Table showing camelCase → snake_case conversions
  Explanation of automatic handling by serialization functions
  
- **Context-Specific Types to Keep**
  Complete list of types that should NOT be migrated
  
- **Testing Checklist**
  Step-by-step verification for each migration
  
- **ESLint/TypeScript Rules to Add**
  Rules to prevent new duplicates from being created
  
- **Reference Files**
  Quick table of key files with line counts

**Best For:** Quick lookups during implementation, field mappings, checklists

**Read Time:** 5-10 minutes to find what you need

---

## Quick Facts

| Metric | Count |
|--------|-------|
| Custom type files | 3 files, 464 lines |
| Generated model files | 101 files, ~9,793 lines |
| Type duplicates | 6+ (FileData x2, GraphNode x3, GraphEntry x2, etc.) |
| Components with local types | 30+ files, 58 type occurrences |
| Context types | 9 files, 27 type occurrences |
| Hook types | 7 files, 10 type occurrences |
| Utility types | 9 files, 33 type occurrences |
| High-priority consolidations | 3 (FileData, Note, Entry) |
| Medium-priority consolidations | 2+ (User/Profile, Enrichment) |
| Types to keep (custom) | ~15 core types, plus component props |

---

## Critical Duplicates

### FileData (DUPLICATE x2)
- `/src/renderer/src/types.ts` lines 44-51
- `/src/renderer/src/utils/editor/textEditor.ts` lines 15-19
- **Replace with:** `FileReference` from generated models
- **Effort:** Low
- **Impact:** High

### GraphNode (DUPLICATE x3)
- `/src/renderer/src/types.ts` lines 107-134
- `/src/renderer/src/types/index.ts` lines 180-185
- `/src/renderer/src/utils/graph.ts` lines 25-42
- **Action:** Keep only D3-optimized version in utils/graph.ts
- **Effort:** Medium
- **Impact:** Medium

### Note (PARTIAL - should use generated)
- `/src/renderer/src/types.ts` lines 56-65
- **Replace with:** `NoteRetrieve`, `NoteCreateRequest`, `NoteEditRequest` (context-dependent)
- **Effort:** Medium
- **Impact:** Very High

### User/Profile (OVERLAPPING)
- `/src/renderer/src/types/index.ts` lines 30-43
- `/src/renderer/src/contexts/user/ProfileContext.tsx` lines 14-27
- **Replace with:** `UserRetrieve` as base, with `ExtendedProfile` wrapper
- **Effort:** Medium
- **Impact:** Medium

### Alert (DUPLICATE x2 with differences)
- `/src/renderer/src/types.ts` lines 14-21
- `/src/renderer/src/utils/api.ts` lines 43-47
- **Action:** Consolidate to single definition
- **Effort:** Low
- **Impact:** Low

---

## High-Priority Consolidations

### 1. FileData → FileReference
**Priority:** HIGH  
**Effort:** LOW  
**Impact:** HIGH

Field mapping:
```
minio_file_name  →  minioFileName
file_name        →  fileName
bucket_name      →  bucketName
(new)            →  id (optional)
(new)            →  timestamp (optional readonly)
```

Locations to update:
- `/src/renderer/src/components/files/*`
- `/src/renderer/src/components/notes/*`
- `/src/renderer/src/utils/editor/textEditor.ts` (remove duplicate definition)

### 2. Note → NoteRetrieve/NoteCreateRequest/NoteEditRequest
**Priority:** HIGH  
**Effort:** MEDIUM  
**Impact:** VERY HIGH

Use context-dependent:
- Display/retrieve: `NoteRetrieve`
- Create forms: `NoteCreateRequest`
- Edit forms: `NoteEditRequest`

Locations to update:
- `/src/renderer/src/components/notes/*`
- `/src/renderer/src/components/dashboard/Notes.jsx`
- `/src/renderer/src/components/documents/Notes.jsx`
- `/src/renderer/src/utils/editor/textEditor.ts`

### 3. DashboardEntry/GraphEntry → Entity/Entry
**Priority:** HIGH  
**Effort:** MEDIUM  
**Impact:** HIGH

Locations to update:
- `/src/renderer/src/components/dashboard/*`
- `/src/renderer/src/components/graph/*`
- `/src/renderer/src/utils/graph.ts`

---

## Types to Keep (Do NOT Migrate)

### Context Values
```typescript
ModalData, ModalContextValue
TabContextValue, Tab
LayoutContextValue (with PaneNode, SplitNode, LayoutNode, LayoutState)
ThemeContextValue
ApiContextValue
```

### Form & Validation
```typescript
FormState<T>
FormValidationError
FormSubmitOptions
UseFormValidationReturn
```

### UI Utilities
```typescript
Notification, NotificationType
BaseComponentProps
Theme (the union type)
```

### Specialized Utilities
```typescript
ParsedAPIError
HandleAPIErrorOptions
Graph D3 properties (x, y, vx, vy, fx, fy with Set<>)
StateSetter<T>
```

### React-Specific
```typescript
All component prop interfaces (SidebarSectionProps, etc.)
All hook return types
All context hook types
```

---

## Migration Workflow

### For Each Type Consolidation:

1. **Read the analysis** (TYPE_SYSTEM_ANALYSIS.md Section 5)
2. **Check the field mapping** (TYPE_CONSOLIDATION_REFERENCE.md)
3. **Find all usages** (TYPE_CONSOLIDATION_REFERENCE.md - Type Usage Patterns)
4. **Update imports** (Use import path change examples)
5. **Test thoroughly** (Use testing checklist)
6. **Update documentation** (Update related comments/docs)
7. **Lint/validate** (Run TypeScript, ESLint)
8. **PR review** (Have another developer review)

---

## Key Insights

### Why Consolidate?
1. **Single Source of Truth:** Generated models always match API schema
2. **No Manual Updates:** API changes automatically reflected in types
3. **Runtime Safety:** Type guards (instanceOf*) for validation
4. **Better Serialization:** JSON conversion handles camelCase/snake_case
5. **Consistency:** All components use same types

### Challenges to Watch
1. **Naming:** Generated uses camelCase, custom uses snake_case
2. **Readonly:** Generated marks server-computed fields as readonly
3. **Optionality:** Generated may have different optional patterns
4. **Completeness:** Generated models have more fields than simplified custom types
5. **Circular deps:** Risk of importing from both custom and generated

### Solutions Provided
1. **Field mappings** - exact conversion for each type
2. **Import examples** - before/after for each consolidation
3. **Testing checklist** - validation steps for each migration
4. **ESLint rules** - prevent new duplicates after migration

---

## Document Navigation Guide

**Starting point:** Read this document first (5 min)

**Want detailed analysis?**  
→ Read TYPE_SYSTEM_ANALYSIS.md Sections 3, 5, 6

**Ready to implement?**  
→ Use TYPE_CONSOLIDATION_REFERENCE.md

**Need specific field mappings?**  
→ TYPE_CONSOLIDATION_REFERENCE.md Field Mapping Examples

**Want to understand patterns?**  
→ TYPE_SYSTEM_ANALYSIS.md Section 4

**Planning migration strategy?**  
→ TYPE_SYSTEM_ANALYSIS.md Section 7

**Need testing guidance?**  
→ TYPE_CONSOLIDATION_REFERENCE.md Testing Checklist

**Want to prevent future issues?**  
→ TYPE_CONSOLIDATION_REFERENCE.md ESLint/TypeScript Rules

---

## File Locations

```
Project Root: /home/user/Projects/.worktrees/cradle-ts/ui/

Documentation:
  TYPE_SYSTEM_DOCS_INDEX.md (this file)
  TYPE_SYSTEM_ANALYSIS.md (full analysis - 683 lines)
  TYPE_CONSOLIDATION_REFERENCE.md (quick reference - tables & examples)

Type Definition Files:
  src/renderer/src/types.ts (135 lines)
  src/renderer/src/types/index.ts (235 lines)
  src/renderer/src/types/declarations.d.ts (94 lines)

Generated Models:
  src/renderer/src/services/cradle/models/ (101 files, ~9,793 lines)
  src/renderer/src/services/cradle/models/index.ts (exports all)

Key Source Files:
  src/renderer/src/contexts/*/
  src/renderer/src/hooks/*/
  src/renderer/src/components/*/
  src/renderer/src/utils/*/
```

---

## Estimated Effort

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Mapping | 1-2 weeks | Audit imports, create mappings, plan strategy |
| Phase 2: High-Impact | 2-4 weeks | FileData, Note, Entry consolidations |
| Phase 3: Medium-Impact | 3-6 weeks | User/Profile, Enrichment consolidations |
| Phase 4: Cleanup | 2+ weeks | Remove duplicates, test, document |
| **Total** | **8-16 weeks** | Depends on parallel execution |

---

## Success Criteria

- [ ] No duplicate type definitions exist
- [ ] All data model types imported from generated models
- [ ] Type guards used for runtime validation where appropriate
- [ ] All tests pass
- [ ] No TypeScript/ESLint errors
- [ ] No circular dependencies
- [ ] Documentation updated
- [ ] Lint rules added to prevent future duplicates
- [ ] Team trained on new patterns

---

## Contact & Questions

If questions arise during implementation:
1. Check TYPE_SYSTEM_ANALYSIS.md Section 6 for conflicts/issues
2. Check TYPE_CONSOLIDATION_REFERENCE.md for specific examples
3. Refer to generated model files themselves (they have JSDoc)
4. Check API spec (OpenAPI/Swagger) for authoritative definitions

---

**Last Updated:** 2025-11-13  
**Analysis Tool:** Claude Code (Anthropic)  
**Status:** Ready for implementation

