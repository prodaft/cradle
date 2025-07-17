export const EditorEvents = {
  CONTENT_CHANGED: 'editor:content_changed',
  SCROLL_CHANGED: 'editor:scroll_changed',
  CURSOR_CHANGED: 'editor:cursor_changed',
  SEND_TO_PREVIEW:   'editor:internal:send_to_preview',
  UPDATE_CONFIG:     'editor:internal:update_config',
  PREVIEW_REQUEST: 'preview:request',
  PREVIEW_SCROLL_SYNC: 'preview:scroll_sync',
  PREVIEW_READY: 'preview:ready'
} as const;

export type EditorEventType = typeof EditorEvents[keyof typeof EditorEvents];