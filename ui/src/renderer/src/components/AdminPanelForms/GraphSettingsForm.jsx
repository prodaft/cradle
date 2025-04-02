import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { Tabs, Tab } from '../Tabs/Tabs';
import {
    getSettings,
    setSettings,
    performAction,
} from '../../services/managementService/managementService';

const graphSettingsSchema = Yup.object().shape({
    K: Yup.number()
        .typeError('Must be a number')
        .required('Edge length constant (K) is required')
        .min(1, 'K must be at least 1'),
    p: Yup.number()
        .typeError('Must be a number')
        .required('Repulsive force strength (p) is required')
        .min(0, 'p must be at least 0'),
    theta: Yup.number()
        .typeError('Must be a number')
        .required('Theta is required')
        .min(0, 'Theta must be at least 0')
        .max(1, 'Theta cannot exceed 1'),
    max_level: Yup.number()
        .typeError('Must be a number')
        .required('Max level is required')
        .min(1, 'Max level must be at least 1'),
    epsilon: Yup.number()
        .typeError('Must be a number')
        .required('Epsilon is required')
        .min(0, 'Epsilon must be positive'),
    r: Yup.number()
        .typeError('Must be a number')
        .required('r is required')
        .min(0, 'r must be positive'),
    max_iter: Yup.number()
        .typeError('Must be a number')
        .required('Max iterations is required')
        .min(1, 'Max iterations must be at least 1'),
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
            K: 300,
            p: 2,
            theta: 0.9,
            max_level: 10,
            epsilon: 0.001,
            r: 5,
            max_iter: 2000,
        },
    });

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        async function fetchGraphSettings() {
            try {
                const response = await getSettings();
                if (response.status === 200 && response.data) {
                    reset({
                        K: response.data.graph?.K ?? 300,
                        p: response.data.graph?.p ?? 2,
                        theta: response.data.graph?.theta ?? 0.9,
                        max_level: response.data.graph?.max_level ?? 10,
                        epsilon: response.data.graph?.epsilon ?? 0.001,
                        r: response.data.graph?.r ?? 5,
                        max_iter: response.data.graph?.max_iter ?? 2000,
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
                    K: data.K,
                    p: data.p,
                    theta: data.theta,
                    max_level: data.max_level,
                    epsilon: data.epsilon,
                    r: data.r,
                    max_iter: data.max_iter,
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
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                        <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                            <Tab title='Simulation Settings'>
                                <div className='flex flex-col gap-3 pt-2'>
                                    <FormField
                                        type='number'
                                        name='K'
                                        labelText='Edge Length Constant (K)'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('K')}
                                        error={errors.K?.message}
                                    />
                                    <FormField
                                        type='number'
                                        name='p'
                                        labelText='Repulsive Force Strength (p)'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('p')}
                                        error={errors.p?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='0.01'
                                        name='theta'
                                        labelText='Tradeoff Between Speed and Precision (theta)'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('theta')}
                                        error={errors.theta?.message}
                                    />
                                    <FormField
                                        type='number'
                                        name='max_level'
                                        labelText='Max Level (for Multilevel Optimization)'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('max_level')}
                                        error={errors.max_level?.message}
                                    />
                                    <FormField
                                        type='number'
                                        name='r'
                                        labelText='r (Attractive Force Between Connected Components)'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('r')}
                                        error={errors.r?.message}
                                    />
                                    <FormField
                                        type='number'
                                        step='0.001'
                                        name='epsilon'
                                        labelText='Convergence Precision (epsilon)'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('epsilon')}
                                        error={errors.epsilon?.message}
                                    />
                                    <FormField
                                        type='number'
                                        name='max_iter'
                                        labelText='Maximum Iterations (max_iter)'
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
                        <AlertBox alert={alert} />
                    </form>
                </div>
            </div>
        </div>
    );
}
