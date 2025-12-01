import useApi from '@/hooks/api/useApi';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Form, FormSwitch } from '../../../forms';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

interface UserSettingsFormProps {
    onAdd?: () => void;
}

interface FormData {
    allowRegistration: boolean;
    requireEmailActivation: boolean;
    requireAdminConfirmation: boolean;
}

const accountSettingsSchema = Yup.object().shape({
    allowRegistration: Yup.boolean().default(false),
    requireEmailActivation: Yup.boolean().default(false),
    requireAdminConfirmation: Yup.boolean().default(false),
});

export default function UserSettingsForm({ onAdd }: UserSettingsFormProps) {
    const { managementApi } = useApi();
    const [isLoading, setIsLoading] = useState(true);
    const [initialData, setInitialData] = useState<FormData>({
        allowRegistration: false,
        requireEmailActivation: false,
        requireAdminConfirmation: false,
    });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await managementApi.managementSettingsRetrieve();
                if (settings && settings.users) {
                    setInitialData({
                        allowRegistration: settings.users.allow_registration ?? false,
                        requireEmailActivation:
                            settings.users.require_email_confirmation ?? false,
                        requireAdminConfirmation:
                            settings.users.require_admin_confirmation ?? false,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch account settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [managementApi]);

    const handleSubmit = async (data: FormData) => {
        await managementApi.managementSettingsCreate({
            requestBody: {
                users: {
                    allow_registration: data.allowRegistration,
                    require_email_confirmation: data.requireEmailActivation,
                    require_admin_confirmation: data.requireAdminConfirmation,
                },
            },
        });
        if (onAdd) onAdd();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse cradle-text-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen cradle-bg-primary">
            {/* Page Header - Full Width */}
            <div className="cradle-border-b cradle-bg-elevated">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold cradle-text-primary cradle-mono tracking-tight">
                                System Settings
                            </h1>
                            <p className="text-sm cradle-text-tertiary cradle-mono mt-1">
                                Configure system-wide preferences and policies
                            </p>
                        </div>
                        <div className="text-xs cradle-text-muted cradle-mono tracking-wider">
                            SYSTEM SETTINGS
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                <Tabs tabClass={TabClasses.PILL}>
                    <Tab title="User Management">
                        <div className="cradle-border cradle-bg-elevated p-6 mt-6">
                            <Form<FormData>
                                schema={accountSettingsSchema}
                                defaultValues={initialData}
                                onSubmit={handleSubmit}
                                successMessage="Account settings updated successfully!"
                                className="space-y-4"
                            >
                                <FormSwitch<FormData>
                                    name="allowRegistration"
                                    label="Allow Registration"
                                />
                                <FormSwitch<FormData>
                                    name="requireEmailActivation"
                                    label="Require Email Activation"
                                />
                                <FormSwitch<FormData>
                                    name="requireAdminConfirmation"
                                    label="Require Admin Confirmation of New Accounts"
                                />
                                <button
                                    type="submit"
                                    className="cradle-btn cradle-btn-primary w-full mt-6"
                                >
                                    Save Settings
                                </button>
                            </Form>
                        </div>
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
}
