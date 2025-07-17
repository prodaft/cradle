import './CodeEditorTab';
import './PreviewTab';
import './SublayoutTab';

// Auto-registration with dynamic imports
export async function loadAllTabs() {
  await Promise.all([
    import('./CodeEditorTab'),
    import('./PreviewTab'),
    import('./SublayoutTab'),
  ]);
}