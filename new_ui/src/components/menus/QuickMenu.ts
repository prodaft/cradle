import { BaseCommand } from '../commands/core';
import { NotesApi } from "../../services/cradle";
import { HelloWorldCommand } from '../commands/implementations/HelloWorldCommand';
import { OpenNoteCommand } from '../commands/implementations/OpenNoteCommand';

export class QuickMenu {
    private addTab: (tabType: string, config?: any) => void;
    private notesApi: NotesApi;

    constructor(addTab: (tabType: string, config?: any, targetTabset?: string) => void, notesApi: NotesApi) {
        this.addTab = addTab;
        console.log(notesApi)
        this.notesApi = notesApi;
    }

    public getQuickMenuItems = async (input: string): Promise<BaseCommand[]> => {
        const noteCmds = (await this.notesApi.notesList({
            content: input,
        })).results.map(note => new OpenNoteCommand(note, this.addTab));

        // For now, return an empty array until we implement specific commands
        // This will be populated with actual command instances
        const commands: BaseCommand[] = [
            ...noteCmds
        ];
        
        return commands;
    }
}