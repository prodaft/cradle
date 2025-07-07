import React from 'react';
import { BaseTabComponent, RegisterTab } from '../core';
import { EditorEvents } from '../../../types/event.types.ts';
import { VscPreview } from 'react-icons/vsc';

// Preview Tab
@RegisterTab
export class PreviewTab extends BaseTabComponent {
  static componentType(): string {
    return 'preview';
  }
  
  displayName(): string {
    return 'Preview';
  }
  readonly label = 'Preview';
  readonly closable = true;
  readonly icon = <VscPreview className="text-green-400" />;
  readonly defaultConfig = { 
    syncScroll: true,
    autoRefresh: true 
  };

  private previewContent: string = '';
  private linkedEditorTabs: Set<string> = new Set();
  private isScrollSyncing: boolean = false;

  render(): React.ReactElement {
    this.tabId = this.node.getId();

    React.useEffect(() => {
      console.log('PreviewTab mounted:', this.tabId);
      this.setupEventListeners();
      
      // Announce preview is ready
      this.emitEvent(EditorEvents.PREVIEW_READY, {
        action: 'preview_ready'
      });

      return () => this.cleanup();
    }, []);

    return (
      <div className="preview-tab">
        <div className="preview-toolbar">
          <span>Linked Editors: {this.linkedEditorTabs.size}</span>
          <button onClick={() => this.requestEditorLink()}>
            Link with Editor
          </button>
          <button onClick={() => this.refreshPreview()}>
            Refresh
          </button>
        </div>
        
        <div 
          className="preview-container"
          onScroll={this.handleScroll}
          style={{ 
            height: '400px', 
            overflow: 'auto',
            border: '1px solid #ccc',
            padding: '20px'
          }}
        >
          {this.previewContent ? (
            // This is where you'd render your actual preview
            // For now, just showing raw content
            <div       className="flex flex-col h-full">
              {this.previewContent}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              No content to preview. Link with a code editor to see content.
            </div>
          )}
        </div>
      </div>
    );
  }

  private setupEventListeners(): void {
    // Listen for content changes from editor
    this.subscribeToEvent(EditorEvents.CONTENT_CHANGED, (event) => {
      console.log('Content changed in editor:', event.payload);
      this.previewContent = event.payload.content;
      this.triggerRerender(); // Trigger re-render
    });

    // Listen for scroll changes from editor
    this.subscribeToEvent(EditorEvents.SCROLL_CHANGED, (event) => {
      if (!this.isScrollSyncing) {
        this.syncScrollPosition(event.payload.scrollPercentage);
      }
    });

    // Listen for editor requests
    this.subscribeToEvent(EditorEvents.PREVIEW_REQUEST, (event) => {
      if (event.payload.action === 'link_request') {
        this.linkedEditorTabs.add(event.sourceTabId);
        this.previewContent = event.payload.content;
        this.triggerRerender();
      } else if (event.payload.action === 'editor_closing') {
        this.linkedEditorTabs.delete(event.sourceTabId);
      }
    });
  }

  private handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    if (this.isScrollSyncing) return;

    const target = e.target as HTMLDivElement;
    const scrollPercentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
    
    // Emit scroll sync back to editor
    this.emitEvent(EditorEvents.PREVIEW_SCROLL_SYNC, {
      scrollPercentage: scrollPercentage || 0,
      syncToEditor: true
    });
  };

  private syncScrollPosition(scrollPercentage: number): void {
    this.isScrollSyncing = true;
    
    const container = document.querySelector('.preview-container') as HTMLDivElement;
    if (container) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = maxScroll * scrollPercentage;
    }
    
    setTimeout(() => {
      this.isScrollSyncing = false;
    }, 100);
  }

  private requestEditorLink(): void {
    // Find available editor tabs
    this.emitEvent(EditorEvents.PREVIEW_REQUEST, {
      action: 'preview_link_request',
      previewId: this.tabId
    });
  }

  private refreshPreview(): void {
    // Request fresh content from linked editors
    this.linkedEditorTabs.forEach(editorId => {
      this.emitEvent(EditorEvents.PREVIEW_REQUEST, {
        action: 'refresh_request'
      }, editorId);
    });
  }

  private triggerRerender(): void {
    // In a real React component, you'd use setState or a hook
    // This is a placeholder for triggering re-render
  }

  onTabDestroyed(): void {
    // Notify linked editors that preview is closing
    this.linkedEditorTabs.forEach(editorId => {
      this.emitEvent(EditorEvents.PREVIEW_REQUEST, {
        action: 'preview_closing',
        previewId: this.tabId
      }, editorId);
    });
    this.cleanup();
  }
}