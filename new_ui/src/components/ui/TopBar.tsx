import React, { useCallback, useRef } from 'react';
import { Dropdown } from 'rsuite';
import { VscSearch, VscArrowLeft, VscArrowRight, VscFile, VscGear, VscSymbolClass } from 'react-icons/vsc';
import { Logo } from './Logo';
import { useCommandPanel } from '../../providers/CommandPanelProvider';
import { HelloWorldCommand } from '../commands/implementations/HelloWorldCommand';
import { QuickMenu } from '../menus/QuickMenu';
import { useApiClients, useFlexLayout } from '../../hooks';

const TopBar: React.FC = ({addTab}) => {
  const searchBarRef = useRef<HTMLDivElement>(null);
  const { showPanel } = useCommandPanel();
  const {notesApi} = useApiClients();

  const handleSearchBarClick = useCallback(async () => {
    if (!notesApi) {
      console.error("Notes API is not available");
      return;
    }
    console.log(notesApi);

    const quickMenu = new QuickMenu(addTab, notesApi);
    console.log(quickMenu);
    await showPanel(quickMenu.getQuickMenuItems);
  }, [addTab, notesApi, showPanel]);


  return (
    <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-center px-2 text-sm text-foreground select-none">
      {/* Menu Bar */}
      <div className="flex items-center space-x-1 text-xs">
        <Logo text={false} className='h-5'/>
        <Dropdown 
          title="Account" 
          size="xs"
          placement="bottomStart"
          className="text-foreground"
          toggleClassName="pr-0"
          noCaret
        >
          <Dropdown.Item>My Account</Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item>Logout</Dropdown.Item>
        </Dropdown>
        
        <Dropdown 
          title="Settings" 
          size="xs"
          placement="bottomStart"
          className="text-foreground"
          toggleClassName="px-4"
          noCaret
        >
          <Dropdown.Item>Editor</Dropdown.Item>
          <Dropdown.Item>Theme</Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item>Keyboard Shortcuts</Dropdown.Item>
        </Dropdown>
      </div>

      {/* Center - Search Field with Navigation Buttons */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-2">
          {/* Navigation Buttons */}
          <button 
            className="p-1 hover:bg-gray-100 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Go back"
          >
            <VscArrowLeft className="h-3 w-3" />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Go forward"
          >
            <VscArrowRight className="h-3 w-3" />
          </button>
          
          {/* Search Field */}
          <div 
            ref={searchBarRef}
            data-search-area
            className="flex items-center justify-center w-[500px] px-3 py-0.5 bg-gray-50 border border-gray-200 rounded-md cursor-pointer hover:border-gray-300 transition-colors"
            onClick={handleSearchBarClick}
          >
            <VscSearch className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-foreground ml-1">
              CRADLE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
