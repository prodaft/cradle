import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BaseTabComponent, RegisterTab } from '../core';
import { EditorEvents } from '../../../types/event.types';
import { Editor, EditorRef } from '../../../ui';
import { VscKebabVertical, VscNote, VscPlay } from 'react-icons/vsc';
import { useTheme } from '../../../providers/ThemeProvider';
import { showPopup } from '../../ui/PopupMenu';
import { useApiClients } from '../../../hooks';

type EditorConfig = {
  autoSave: boolean;
  autoRender: boolean;
  syncScroll: boolean;
  id: string | null;
};

// Functional component for the actual tab content
const CodeEditorTabContent: React.FC<{ node: any; tabInstance: CodeEditorTab, originalConfig: EditorConfig }> = ({ node, tabInstance, originalConfig }) => {
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef<EditorRef>(null);
  const { themeConfig } = useTheme()
  const [config, setConfig] = useState<EditorConfig>(originalConfig);
  const { notesApi } = useApiClients();

  const loadNote = async (noteId: string) => {
    if (!notesApi)
      return;
    const note = await notesApi.notesRetrieve({
      noteIdS: noteId,
      footnotes: false,
    })

    setEditorContent(note.content || '');
  }

  useEffect(() => {
    // Load initial content from the note if available
    if (config.id) {
      loadNote(config.id)
    }
  }, [config.id]);

  const setupEventListeners = useCallback(() => {
    // Listen for preview tab announcements
    tabInstance.subscribeToEvent(EditorEvents.PREVIEW_READY, (event) => {
      tabInstance.getLinkedPreviewTabs().add(event.sourceTabId);
      // Send current content to new preview
      tabInstance.emitEvent(EditorEvents.CONTENT_CHANGED, {
        content: '',
        scrollTop: 0
      });
    });

    // Listen for scroll sync from preview
    tabInstance.subscribeToEvent(EditorEvents.PREVIEW_SCROLL_SYNC, (event) => {
      if (event.payload.syncToEditor) {
        syncScrollPosition(event.payload.scrollPercentage);
      }
    });

    tabInstance.subscribeToEvent(EditorEvents.SEND_TO_PREVIEW, (event) => {
    tabInstance.emitEvent(EditorEvents.CONTENT_CHANGED, {
      content: editorContent,
      scrollTop: editorRef.current?.getScrollInfo().scrollTop || 0
    });
    });

    tabInstance.subscribeToEvent(EditorEvents.UPDATE_CONFIG, (event) => {
      const newConfig = event.payload.config as EditorConfig;
      setConfig(newConfig);
    })
  }, [tabInstance]);

  const syncScrollPosition = useCallback((scrollPercentage: number) => {
    // Find the editor instance through the data attribute and call its scroll method
    const tabContainer = document.querySelector(`[data-tab-id="${tabInstance.tabId}"]`);
    if (tabContainer) {
      // Access the editor ref through a data attribute or similar mechanism
      // For now, use direct DOM manipulation as a fallback
      const editorContainer = tabContainer.querySelector('.cm-scroller');
      if (editorContainer) {
        const maxScroll = editorContainer.scrollHeight - editorContainer.clientHeight;
        editorContainer.scrollTop = maxScroll * scrollPercentage;
      }
    }
  }, [tabInstance.tabId, config]);

  useEffect(() => {
    setupEventListeners();

    // Announce editor is ready
    tabInstance.emitEvent(EditorEvents.PREVIEW_REQUEST, {
      action: 'editor_ready',
      content: editorContent
    });

    return () => tabInstance.cleanup();
  }, [tabInstance, editorContent]);

  const handleContentChange = useCallback((value: string) => {
    setEditorContent(value);

    if (config?.autoRender) {
      tabInstance.emitEvent(EditorEvents.CONTENT_CHANGED, {
        content: value,
        scrollTop: editorRef.current?.getScrollInfo().scrollTop || 0
      });
    }

  }, [tabInstance, config]);

  const handleScroll = useCallback((scrollInfo: { scrollTop: number; scrollPercentage: number }) => {
    if (config?.syncScroll) {
      // Emit scroll change to linked preview tabs
      tabInstance.emitEvent(EditorEvents.SCROLL_CHANGED, {
        scrollTop: scrollInfo.scrollTop,
        scrollPercentage: scrollInfo.scrollPercentage
      });
    }
  }, [tabInstance]);

  return (
    <div className="code-editor-tab h-full flex flex-col">
      <Editor
        ref={editorRef}
        value={editorContent}
        onChange={handleContentChange}
        onScroll={handleScroll}
        theme={themeConfig.codeMirrorTheme}
        placeholder="Start typing your markdown..."
        className="flex-1"
      />
    </div>
  );
};

@RegisterTab
export class CodeEditorTab extends BaseTabComponent {
  readonly tabType = 'codeEditor';
  static componentType(): string {
    return 'codeEditor';
  }

  displayName(): string {
    // Random string for now
    return `Code Editor - ${this.tabId}`;
  }

  readonly label = 'Code Editor';
  readonly closable = true;
  readonly icon = <VscNote className="text-blue-400" />;
  readonly defaultConfig = {
    note_id: null,
    autoRender: true,
    autoSave: true,
    syncScroll: true
  };

  private linkedPreviewTabs: Set<string> = new Set();

  // Make methods accessible to the component
  public getLinkedPreviewTabs(): Set<string> {
    return this.linkedPreviewTabs;
  }

  render(): React.ReactElement {
    this.tabId = this.node.getId();
    return (
      <div data-tab-id={this.tabId} className="h-full">
        <CodeEditorTabContent node={this.node} tabInstance={this} originalConfig={this.config}/>
      </div>
    );
  }

  onTabDestroyed(): void {
    // Notify linked previews that editor is closing
    this.emitEvent(EditorEvents.PREVIEW_REQUEST, {
      action: 'editor_closing',
      editorId: this.tabId
    });
    this.cleanup();
  }

  showKebabMenu(event: React.MouseEvent): void {
      event.preventDefault();
      event.stopPropagation();

      showPopup(
          null,
          document.getElementsByClassName("flexlayout__layout")[0]!,
          event.clientX, event.clientY,
          [
            {
              name: this.config.autoSave ? "Disable Auto Save" : "Enable Auto Save",
              callback: (event) => {
                this.config.autoSave = !this.config.autoSave;
                let name = this.config.autoSave ? "Disable Auto Save" : "Enable Auto Save";
                this.emitEvent(EditorEvents.UPDATE_CONFIG, { config: this.config }, this.tabId);
                this.saveConfig()
                return [name, false];
              }
            },
            {
              name: this.config.syncScroll ? "Disable Sync Scroll" : "Enable Sync Scroll",
              callback: (event) => {
                this.config.syncScroll = !this.config.syncScroll;
                let name = this.config.syncScroll ? "Disable Sync Scroll" : "Enable Sync Scroll";
                this.emitEvent(EditorEvents.UPDATE_CONFIG, { config: this.config }, this.tabId);
                this.saveConfig()
                return [name, false];
              }
            },
            {
              name: this.config.autoRender ? "Disable Auto Preview" : "Enable Auto Preview",
              callback: (event) => {
                this.config.autoRender = !this.config.autoRender;
                let name = this.config.autoRender ? "Disable Auto Preview" : "Enable Auto Preview";
                this.emitEvent(EditorEvents.UPDATE_CONFIG, { config: this.config }, this.tabId);
                this.saveConfig()
                return [name, false];
              }
            },
            {
              name: "Publishable: ",
              callback: (event) => {
                // TODO: Implement publishable state stuff
                return ['', true];
              }
            },
            {
              name: "Delete",
              callback: (event) => {
                // TODO: Implement deletion
                return ['', true];
              }
            }
          ],
        );
  }


  public tabsetButtons(): React.ReactElement[] {
    // TODO: Do the toolbar stuff here
    return [
      <button
        className="border-none bg-transparent text-green-600 shadow-none flexlayout__tab_toolbar_button"
        key="run-button"
        onClick={() => 
        {
          this.emitEvent(EditorEvents.SEND_TO_PREVIEW, {}, this.tabId);
        }}
        >
        <VscPlay className="text-green-600" />
      </button>,
      <button
        className="border-none bg-transparent text-gray-600 shadow-none flexlayout__tab_toolbar_button"
        key="kebab-button"
        onClick={(event) => this.showKebabMenu(event)}
      >
        <VscKebabVertical className="text-gray-600" />
      </button>
    ];
  }
}
