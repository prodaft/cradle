import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import SnippetList from '../../../base/SnippetList/SnippetList';
import { Form, FormAlert, FormAlertState, FormInput, FormSwitch } from '../../../forms';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

interface FormData {
    minEntries: number;
    minEntities: number;
    maxCliqueSize: number;
    allowDynamicEntryClassCreation: boolean;
}

const noteSettingsSchema = Yup.object().shape({
    minEntries: Yup.number()
        .typeError('Must be a number')
        .required('Minimum number of entries is required')
        .min(1, 'Must be at least 1'),
    minEntities: Yup.number()
        .typeError('Must be a number')
        .required('Minimum number of entities is required')
        .min(1, 'Must be at least 1'),
    maxCliqueSize: Yup.number()
        .typeError('Must be a number')
        .required('Maximum clique size is required')
        .min(1, 'Must be at least 1'),
    allowDynamicEntryClassCreation: Yup.boolean().default(false),
});

export default function NoteSettingsForm() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();
    const [isLoading, setIsLoading] = useState(true);
    const [actionAlert, setActionAlert] = useState<FormAlertState>({ type: null, message: '' });
    const [initialData, setInitialData] = useState<FormData>({
        minEntries: 1,
        minEntities: 1,
        maxCliqueSize: 1,
        allowDynamicEntryClassCreation: false,
    });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await managementApi.managementSettingsRetrieve();
                if (settings && settings.notes) {
                    setInitialData({
                        minEntries: settings.notes.min_entries || 1,
                        minEntities: settings.notes.min_entities || 1,
                        maxCliqueSize: settings.notes.max_clique_size || 1,
                        allowDynamicEntryClassCreation:
                            settings.notes.allow_dynamic_entry_class_creation ?? false,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [managementApi]);

    const handleSubmit = async (data: FormData) => {
        await managementApi.managementSettingsCreate({
            requestBody: {
                notes: {
                    min_entries: data.minEntries,
                    min_entities: data.minEntities,
                    max_clique_size: data.maxCliqueSize,
                    allow_dynamic_entry_class_creation: data.allowDynamicEntryClassCreation,
                },
            },
        });
    };

    const handleReLinkNotes = async () => {
        try {
            await execute(
                () => managementApi.managementActionsCreate({ actionName: 'relinkNotes' }),
                { suppressNotification: true },
            );
            setActionAlert({ type: 'success', message: 'Re-Link all Notes action triggered!' });
        } catch {
            setActionAlert({ type: 'error', message: 'Failed to re-link notes' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse cradle-text-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-2xl px-4">
                <h1 className="text-center text-xl font-bold text-primary mb-4">
                    Note Settings
                </h1>
                <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md">
                    <Tabs tabClass={TabClasses.PILL}>
                        <Tab title="Settings">
                            <Form<FormData>
                                schema={noteSettingsSchema}
                                defaultValues={initialData}
                                onSubmit={handleSubmit}
                                successMessage="Settings updated successfully!"
                                className="flex flex-col gap-4 pt-2"
                            >
                                <FormInput<FormData>
                                    name="minEntries"
                                    label="Minimum Number of Entries in a Note"
                                    type="number"
                                />
                                <FormInput<FormData>
                                    name="minEntities"
                                    label="Minimum Number of Entities in a Note"
                                    type="number"
                                />
                                <FormInput<FormData>
                                    name="maxCliqueSize"
                                    label="Maximum Clique Size"
                                    type="number"
                                />
                                <FormSwitch<FormData>
                                    name="allowDynamicEntryClassCreation"
                                    label="Allow Dynamic Entry Class Creation"
                                />
                                <button type="submit" className="btn btn-primary btn-block mt-2">
                                    Save Settings
                                </button>
                            </Form>
                        </Tab>
                        <Tab title="Snippets">
                            <div className="flex flex-col gap-3 pt-2">
                                <SnippetList userId="null" />
                            </div>
                        </Tab>
                        <Tab title="Actions">
                            <div className="flex flex-col gap-2 pt-4">
                                <FormAlert
                                    alert={actionAlert}
                                    onDismiss={() => setActionAlert({ type: null, message: '' })}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleReLinkNotes}
                                >
                                    Re-Link all Notes
                                </button>
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
