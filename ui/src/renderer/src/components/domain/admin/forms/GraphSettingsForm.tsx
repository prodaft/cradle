import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import {
    Form,
    FormAlert,
    FormAlertState,
    FormInput,
    FormSelect,
    FormSwitch,
    SelectOption,
} from '../../../forms';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

interface SimulateMethodOption extends SelectOption<string> {
    value: 'forceatlas2' | 'graph_tool';
    label: string;
}

interface GraphSettingsFormValues {
    simulate_method: SimulateMethodOption | null;
    dissuade_hubs: boolean;
    lin_log_mode: boolean;
    adjust_sizes: boolean;
    jitter_tolerance: number;
    barnes_hut_optimize: boolean;
    barnes_hut_theta: number;
    scaling_ratio: number;
    strong_gravity_mode: boolean;
    gravity: number;
    max_iter_fa2: number;
    K: number;
    p: number;
    theta: number;
    max_level: number;
    epsilon: number;
    r: number;
    max_iter_gt: number;
}

interface GraphSettingsResponse {
    graph?: {
        simulate_method?: 'forceatlas2' | 'graph_tool';
        dissuade_hubs?: boolean;
        lin_log_mode?: boolean;
        adjust_sizes?: boolean;
        jitter_tolerance?: number;
        barnes_hut_optimize?: boolean;
        barnes_hut_theta?: number;
        scaling_ratio?: number;
        strong_gravity_mode?: boolean;
        gravity?: number;
        max_iter_fa2?: number;
        K?: number;
        p?: number;
        theta?: number;
        max_level?: number;
        epsilon?: number;
        r?: number;
        max_iter_gt?: number;
    };
}

const simulateMethodOptions: SimulateMethodOption[] = [
    { value: 'forceatlas2', label: 'ForceAtlas2' },
    { value: 'graph_tool', label: 'Graph Tool' },
];

const graphSettingsSchema = Yup.object().shape({
    simulate_method: Yup.object()
        .shape({ value: Yup.string().required(), label: Yup.string().required() })
        .nullable()
        .required('Simulation method is required'),
    dissuade_hubs: Yup.boolean().default(false),
    lin_log_mode: Yup.boolean().default(false),
    adjust_sizes: Yup.boolean().default(true),
    jitter_tolerance: Yup.number().min(0, 'Must be positive').default(1.0),
    barnes_hut_optimize: Yup.boolean().default(true),
    barnes_hut_theta: Yup.number().min(0, 'Must be positive').default(1.2),
    scaling_ratio: Yup.number().min(0, 'Must be positive').default(2.0),
    strong_gravity_mode: Yup.boolean().default(false),
    gravity: Yup.number().min(0, 'Must be positive').default(1.0),
    max_iter_fa2: Yup.number().min(1, 'Must be at least 1').default(1000),
    K: Yup.number().min(1, 'Must be at least 1').default(300),
    p: Yup.number().min(0, 'Must be at least 0').default(2),
    theta: Yup.number().min(0).max(1, 'Cannot exceed 1').default(0.9),
    max_level: Yup.number().min(1, 'Must be at least 1').default(10),
    epsilon: Yup.number().min(0, 'Must be positive').default(0.001),
    r: Yup.number().min(0, 'Must be positive').default(5),
    max_iter_gt: Yup.number().min(1, 'Must be at least 1').default(2000),
});

export default function GraphSettingsForm() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();

    const [isLoading, setIsLoading] = useState(true);
    const [actionAlert, setActionAlert] = useState<FormAlertState>({ type: null, message: '' });
    const [initialData, setInitialData] = useState<GraphSettingsFormValues>({
        simulate_method: simulateMethodOptions[0],
        dissuade_hubs: false,
        lin_log_mode: false,
        adjust_sizes: true,
        jitter_tolerance: 1.0,
        barnes_hut_optimize: true,
        barnes_hut_theta: 1.2,
        scaling_ratio: 2.0,
        strong_gravity_mode: false,
        gravity: 1.0,
        max_iter_fa2: 1000,
        K: 300,
        p: 2,
        theta: 0.9,
        max_level: 10,
        epsilon: 0.001,
        r: 5,
        max_iter_gt: 2000,
    });

    useEffect(() => {
        async function fetchGraphSettings() {
            try {
                const settings =
                    (await managementApi.managementSettingsRetrieve()) as GraphSettingsResponse;
                if (settings && settings.graph) {
                    const method = settings.graph.simulate_method ?? 'forceatlas2';
                    setInitialData({
                        simulate_method:
                            simulateMethodOptions.find((o) => o.value === method) ||
                            simulateMethodOptions[0],
                        dissuade_hubs: settings.graph.dissuade_hubs ?? false,
                        lin_log_mode: settings.graph.lin_log_mode ?? false,
                        adjust_sizes: settings.graph.adjust_sizes ?? true,
                        jitter_tolerance: settings.graph.jitter_tolerance ?? 1.0,
                        barnes_hut_optimize: settings.graph.barnes_hut_optimize ?? true,
                        barnes_hut_theta: settings.graph.barnes_hut_theta ?? 1.2,
                        scaling_ratio: settings.graph.scaling_ratio ?? 2.0,
                        strong_gravity_mode: settings.graph.strong_gravity_mode ?? false,
                        gravity: settings.graph.gravity ?? 1.0,
                        max_iter_fa2: settings.graph.max_iter_fa2 ?? 1000,
                        K: settings.graph.K ?? 300,
                        p: settings.graph.p ?? 2,
                        theta: settings.graph.theta ?? 0.9,
                        max_level: settings.graph.max_level ?? 10,
                        epsilon: settings.graph.epsilon ?? 0.001,
                        r: settings.graph.r ?? 5,
                        max_iter_gt: settings.graph.max_iter_gt ?? 2000,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch graph settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGraphSettings();
    }, [managementApi]);

    const handleSubmit = async (data: GraphSettingsFormValues) => {
        await managementApi.managementSettingsCreate({
            requestBody: {
                graph: {
                    simulate_method: data.simulate_method?.value || 'forceatlas2',
                    dissuade_hubs: data.dissuade_hubs,
                    lin_log_mode: data.lin_log_mode,
                    adjust_sizes: data.adjust_sizes,
                    jitter_tolerance: data.jitter_tolerance,
                    barnes_hut_optimize: data.barnes_hut_optimize,
                    barnes_hut_theta: data.barnes_hut_theta,
                    scaling_ratio: data.scaling_ratio,
                    strong_gravity_mode: data.strong_gravity_mode,
                    gravity: data.gravity,
                    max_iter_fa2: data.max_iter_fa2,
                    K: data.K,
                    p: data.p,
                    theta: data.theta,
                    max_level: data.max_level,
                    epsilon: data.epsilon,
                    r: data.r,
                    max_iter_gt: data.max_iter_gt,
                },
            },
        });
    };

    const handleRefreshMaterializedGraph = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: ManagementActionsCreateActionNameEnum.RefreshMaterializedGraph,
                    }),
                { suppressNotification: true },
            );
            setActionAlert({
                type: 'success',
                message: 'Refresh Materialized Graph action triggered!',
            });
        } catch {
            setActionAlert({ type: 'error', message: 'Failed to refresh materialized graph' });
        }
    };

    const handleRecalculateNodePositions = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'recalculateNodePositions' as any,
                    }),
                { suppressNotification: true },
            );
            setActionAlert({
                type: 'success',
                message: 'Re-calculate Node Positions action triggered!',
            });
        } catch {
            setActionAlert({ type: 'error', message: 'Failed to re-calculate node positions' });
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
                    Graph Simulation Settings
                </h1>
                <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md">
                    <Tabs tabClass={TabClasses.PILL}>
                        <Tab title="Simulation Settings">
                            <Form<GraphSettingsFormValues>
                                schema={graphSettingsSchema}
                                defaultValues={initialData}
                                onSubmit={handleSubmit}
                                successMessage="Graph settings updated successfully!"
                                className="flex flex-col gap-4 pt-2"
                            >
                                {({ watch }) => {
                                    const simulateMethod = watch('simulate_method');
                                    const isForceAtlas2 = simulateMethod?.value === 'forceatlas2';
                                    const isGraphTool = simulateMethod?.value === 'graph_tool';

                                    return (
                                        <>
                                            <FormSelect<
                                                GraphSettingsFormValues,
                                                SimulateMethodOption
                                            >
                                                name="simulate_method"
                                                label="Simulation Method"
                                                options={simulateMethodOptions}
                                                required
                                            />

                                            {isForceAtlas2 && (
                                                <>
                                                    <FormSwitch<GraphSettingsFormValues>
                                                        name="dissuade_hubs"
                                                        label="Dissuade Hubs"
                                                    />
                                                    <FormSwitch<GraphSettingsFormValues>
                                                        name="lin_log_mode"
                                                        label="LinLog Mode"
                                                    />
                                                    <FormSwitch<GraphSettingsFormValues>
                                                        name="adjust_sizes"
                                                        label="Adjust Sizes (Prevent Overlap)"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="jitter_tolerance"
                                                        label="Jitter Tolerance"
                                                        type="number"
                                                        step={0.01}
                                                    />
                                                    <FormSwitch<GraphSettingsFormValues>
                                                        name="barnes_hut_optimize"
                                                        label="Barnes-Hut Optimize"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="barnes_hut_theta"
                                                        label="Barnes-Hut Theta"
                                                        type="number"
                                                        step={0.01}
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="scaling_ratio"
                                                        label="Scaling Ratio"
                                                        type="number"
                                                        step={0.01}
                                                    />
                                                    <FormSwitch<GraphSettingsFormValues>
                                                        name="strong_gravity_mode"
                                                        label="Strong Gravity Mode"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="gravity"
                                                        label="Gravity Coefficient"
                                                        type="number"
                                                        step={0.01}
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="max_iter_fa2"
                                                        label="Max Iterations"
                                                        type="number"
                                                        step={10}
                                                    />
                                                </>
                                            )}

                                            {isGraphTool && (
                                                <>
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="K"
                                                        label="Edge Length Constant (K)"
                                                        type="number"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="p"
                                                        label="Repulsive Force Strength (p)"
                                                        type="number"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="theta"
                                                        label="Tradeoff Between Speed and Precision (theta)"
                                                        type="number"
                                                        step={0.01}
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="max_level"
                                                        label="Max Level (for Multilevel Optimization)"
                                                        type="number"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="r"
                                                        label="r (Attractive Force Between Connected Components)"
                                                        type="number"
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="epsilon"
                                                        label="Convergence Precision (epsilon)"
                                                        type="number"
                                                        step={0.001}
                                                    />
                                                    <FormInput<GraphSettingsFormValues>
                                                        name="max_iter_gt"
                                                        label="Maximum Iterations (max_iter)"
                                                        type="number"
                                                    />
                                                </>
                                            )}

                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-block mt-2"
                                            >
                                                Save Settings
                                            </button>
                                        </>
                                    );
                                }}
                            </Form>
                        </Tab>
                        <Tab title="Actions">
                            <div className="flex flex-col gap-4 pt-4">
                                <FormAlert
                                    alert={actionAlert}
                                    onDismiss={() => setActionAlert({ type: null, message: '' })}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleRefreshMaterializedGraph}
                                >
                                    Refresh Materialized Graph
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleRecalculateNodePositions}
                                >
                                    Re-calculate Node Positions
                                </button>
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
