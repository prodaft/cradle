import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
    getSettings,
    performAction,
    setSettings,
} from '../../services/managementService/managementService';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { Tab, Tabs } from '../Tabs/Tabs';

const graphSettingsSchema = Yup.object().shape({
    dissuade_hubs: Yup.boolean().typeError('Must be a boolean'),
    lin_log_mode: Yup.boolean().typeError('Must be a boolean'),
    adjust_sizes: Yup.boolean().typeError('Must be a boolean'),
    jitter_tolerance: Yup.number()
        .typeError('Must be a number')
        .min(0, 'Must be positive'),
    barnes_hut_optimize: Yup.boolean().typeError('Must be a boolean'),
    barnes_hut_theta: Yup.number()
        .typeError('Must be a number')
        .min(0, 'Must be positive'),
    scaling_ratio: Yup.number()
        .typeError('Must be a number')
        .min(0, 'Must be positive'),
    strong_gravity_mode: Yup.boolean().typeError('Must be a boolean'),
    gravity: Yup.number()
        .typeError('Must be a number')
        .required('Gravity is required')
        .min(0, 'Gravity must be positive'),
    max_iter: Yup.number()
        .typeError('Must be a number')
        .min(1, 'Max iterations must be at least 1')
        .required('Max iterations is required'),
});

export default function GraphSettingsForm() {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(graphSettingsSchema),
        defaultValues: {
            dissuade_hubs: false,
            lin_log_mode: false,
            adjust_sizes: true,
            jitter_tolerance: 1.0,
            barnes_hut_optimize: true,
            barnes_hut_theta: 1.2,
            scaling_ratio: 2.0,
            strong_gravity_mode: false,
            gravity: 1.0,
            max_iter: 1000, // Default value for max iterations
        },
    });

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        async function fetchGraphSettings() {
            try {
                const response = await getSettings();
                if (response.status === 200 && response.data) {
                    reset({
                        dissuade_hubs: response.data.graph?.dissuade_hubs ?? false,
                        lin_log_mode: response.data.graph?.lin_log_mode ?? false,
                        adjust_sizes: response.data.graph?.adjust_sizes ?? true,
                        jitter_tolerance: response.data.graph?.jitter_tolerance ?? 1.0,
                        barnes_hut_optimize:
                            response.data.graph?.barnes_hut_optimize ?? true,
                        barnes_hut_theta: response.data.graph?.barnes_hut_theta ?? 1.2,
                        scaling_ratio: response.data.graph?.scaling_ratio ?? 2.0,
                        strong_gravity_mode:
                            response.data.graph?.strong_gravity_mode ?? false,
                        gravity: response.data.graph?.gravity ?? 1.0,
                    });
                }
            } catch (error) {
                console.error(error);
                setAlert({
                    show: true,
                    message: 'Failed to fetch graph settings',
                    color: 'red',
                });
            }
        }
        fetchGraphSettings();
    }, [reset]);

    const onSubmit = async (data) => {
        try {
            const response = await setSettings({
                graph: {
                    dissuade_hubs: data.dissuade_hubs,
                    lin_log_mode: data.lin_log_mode,
                    adjust_sizes: data.adjust_sizes,
                    jitter_tolerance: data.jitter_tolerance,
                    barnes_hut_optimize: data.barnes_hut_optimize,
                    barnes_hut_theta: data.barnes_hut_theta,
                    scaling_ratio: data.scaling_ratio,
                    strong_gravity_mode: data.strong_gravity_mode,
                    gravity: data.gravity,
                },
            });
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Graph settings updated successfully!',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Error updating graph settings',
                color: 'red',
            });
        }
    };

    const handleRefreshMaterializedGraph = async () => {
        try {
            const response = await performAction('refreshMaterializedGraph');
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Refresh Materialized Graph action triggered!',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Failed to refresh materialized graph',
                color: 'red',
            });
        }
    };

    const handleRecalculateNodePositions = async () => {
        try {
            const response = await performAction('recalculateNodePositions');
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Re-calculate Node Positions action triggered!',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Failed to re-calculate node positions',
                color: 'red',
            });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    Graph Simulation Settings
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 mb-3'>
                        <Tabs
                            tabClasses='tabs gap-1 !bg-opacity-0'
                            perTabClass='tab-pill'
                        >
                            <Tab title='Simulation Settings'>
                                <div className='flex flex-col gap-3 pt-2'>
                                    <FormField
                                        type='checkbox'
                                        row={true}
                                        name='dissuade_hubs'
                                        labelText='Dissuade Hubs'
                                        className='form-input switch switch-ghost-primary'
                                        {...register('dissuade_hubs')}
                                        error={errors.dissuade_hubs?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        row={true}
                                        name='lin_log_mode'
                                        labelText='LinLog Mode'
                                        className='form-input switch switch-ghost-primary'
                                        {...register('lin_log_mode')}
                                        error={errors.lin_log_mode?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        row={true}
                                        name='adjust_sizes'
                                        labelText='Adjust Sizes (Prevent Overlap)'
                                        className='form-input switch switch-ghost-primary'
                                        {...register('adjust_sizes')}
                                        error={errors.adjust_sizes?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='0.01'
                                        name='jitter_tolerance'
                                        labelText='Jitter Tolerance'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('jitter_tolerance')}
                                        error={errors.jitter_tolerance?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        row={true}
                                        name='barnes_hut_optimize'
                                        labelText='Barnes-Hut Optimize'
                                        className='form-input switch switch-ghost-primary'
                                        {...register('barnes_hut_optimize')}
                                        error={errors.barnes_hut_optimize?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='0.01'
                                        name='barnes_hut_theta'
                                        labelText='Barnes-Hut Theta'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('barnes_hut_theta')}
                                        error={errors.barnes_hut_theta?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='0.01'
                                        name='scaling_ratio'
                                        labelText='Scaling Ratio'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('scaling_ratio')}
                                        error={errors.scaling_ratio?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        row={true}
                                        name='strong_gravity_mode'
                                        labelText='Strong Gravity Mode'
                                        className='form-input switch switch-ghost-primary'
                                        {...register('strong_gravity_mode')}
                                        error={errors.strong_gravity_mode?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='0.01'
                                        name='gravity'
                                        labelText='Gravity Coefficient'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('gravity')}
                                        error={errors.gravity?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='10'
                                        name='max_iter'
                                        labelText='Max Iterations'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('max_iter')}
                                        error={errors.max_iter?.message}
                                    />
                                    <div className='flex gap-2 pt-4'>
                                        <button
                                            type='submit'
                                            className='btn btn-primary btn-block'
                                        >
                                            Save Settings
                                        </button>
                                    </div>
                                </div>
                            </Tab>
                            <Tab title='Actions'>
                                <div className='flex flex-col gap-2 pt-4'>
                                    <button
                                        type='button'
                                        className='btn btn-outline'
                                        onClick={handleRefreshMaterializedGraph}
                                    >
                                        Refresh Materialized Graph
                                    </button>
                                    <button
                                        type='button'
                                        className='btn btn-outline'
                                        onClick={handleRecalculateNodePositions}
                                    >
                                        Re-calculate Node Positions
                                    </button>
                                </div>
                            </Tab>
                        </Tabs>
                    </form>
                    <AlertBox alert={alert} />
                </div>
            </div>
        </div>
    );
}
