import React from 'react';
import { RegisterCmd, BaseCommand} from '../core';
import { CommandArgs, CommandResult } from '../../../types/command.types';
import { VscNote, VscSquirrel } from 'react-icons/vsc';
import { NoteRetrieve, NoteRetrieveWithLinks } from '../../../services/cradle';
import _ from 'lodash';
import { CodeEditorTab } from '../../tabs/implementations/CodeEditorTab';

@RegisterCmd()
export class OpenNoteCommand extends BaseCommand {
  readonly id = 'open_note';
  readonly icon = () => {
    if (this.args.fleeting)
      return React.createElement(VscSquirrel, { className: 'text-yellow-500' })
    else
      return React.createElement(VscNote, { className: 'text-blue-400' })
  };
  readonly category = 'notes';

  public name(): string {
    return this.args.title ? this.args.title : 'Untitled Note';
  }

  public description(): string {
    const note = this.args as NoteRetrieve | NoteRetrieveWithLinks;
    const details = (note.author.username? note.author.username : "<unknown>") + (note.description ? " - " +  note.description : '')

    return _.truncate(details, {
      length: 100,
      separator: ' ',
    });
  }

  validate(args: CommandArgs): boolean | string {
    return true;
  }

  run(): CommandResult {
    this.addTab!(CodeEditorTab.componentType(), this.args);

    return {
      success: true,
      data: {}
    };
  }

  cleanup(): void {
    // Clean up any resources if needed
    console.log('HelloWorldCommand cleanup completed');
  }
}
