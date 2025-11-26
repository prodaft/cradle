import useApi from '@/hooks/api/useApi';
import { yupResolver } from '@hookform/resolvers/yup';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import AlertBox from '../../../base/Alert/AlertBox';
import FormField from '../../../forms/FormField';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

interface Alert {
  show: boolean;
  message: string;
  color: string;
}

interface GraphSettingsFormValues {
  simulate_method: 'forceatlas2' | 'graph_tool';
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
  graph?: Partial<GraphSettingsFormValues>;
}

const graphSettingsSchema = Yup.object().shape({
  simulate_method: Yup.string()
    .oneOf(['forceatlas2', 'graph_tool'])
    .required() as Yup.Schema<'forceatlas2' | 'graph_tool'>,
  dissuade_hubs: Yup.boolean().typeError('Must be a boolean').required(),
  lin_log_mode: Yup.boolean().typeError('Must be a boolean').required(),
  adjust_sizes: Yup.boolean().typeError('Must be a boolean').required(),
  jitter_tolerance: Yup.number()
    .typeError('Must be a number')
    .min(0, 'Must be positive')
    .required(),
  barnes_hut_optimize: Yup.boolean().typeError('Must be a boolean').required(),
  barnes_hut_theta: Yup.number()
    .typeError('Must be a number')
    .min(0, 'Must be positive')
    .required(),
  scaling_ratio: Yup.number()
    .typeError('Must be a number')
    .min(0, 'Must be positive')
    .required(),
  strong_gravity_mode: Yup.boolean().typeError('Must be a boolean').required(),
  gravity: Yup.number()
    .typeError('Must be a number')
    .required('Gravity is required')
    .min(0, 'Gravity must be positive'),
  max_iter_fa2: Yup.number()
    .typeError('Must be a number')
    .min(1, 'Max iterations must be at least 1')
    .required('Max iterations is required'),
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
  max_iter_gt: Yup.number()
    .typeError('Must be a number')
    .required('Max iterations is required')
    .min(1, 'Max iterations must be at least 1'),
});

export default function GraphSettingsForm() {
  const {
    watch,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GraphSettingsFormValues>({
    resolver: yupResolver(graphSettingsSchema),
    defaultValues: {
      simulate_method: 'forceatlas2',
      K: 300,
      p: 2,
      theta: 0.9,
      max_level: 10,
      epsilon: 0.001,
      r: 5,
      max_iter_gt: 2000,
      dissuade_hubs: false,
      lin_log_mode: false,
      adjust_sizes: true,
      jitter_tolerance: 1.0,
      barnes_hut_optimize: true,
      barnes_hut_theta: 1.2,
      scaling_ratio: 2.0,
      strong_gravity_mode: false,
      gravity: 1.0,
      max_iter_fa2: 1000, // Default value for max iterations
    },
  });

  const [alert, setAlert] = useState<Alert>({
    show: false,
    message: '',
    color: 'red',
  });
  const { managementApi } = useApi();

  useEffect(() => {
    async function fetchGraphSettings() {
      try {
        const settings = (await managementApi.managementSettingsRetrieve()) as GraphSettingsResponse;
        if (settings && settings.graph) {
          reset({
            dissuade_hubs: settings.graph.dissuade_hubs ?? false,
            lin_log_mode: settings.graph.lin_log_mode ?? false,
            adjust_sizes: settings.graph.adjust_sizes ?? true,
            jitter_tolerance: settings.graph.jitter_tolerance ?? 1.0,
            barnes_hut_optimize:
              settings.graph.barnes_hut_optimize ?? true,
            barnes_hut_theta: settings.graph.barnes_hut_theta ?? 1.2,
            scaling_ratio: settings.graph.scaling_ratio ?? 2.0,
            strong_gravity_mode:
              settings.graph.strong_gravity_mode ?? false,
            gravity: settings.graph.gravity ?? 1.0,
            max_iter_fa2: settings.graph.max_iter_fa2 ?? 1000,
            simulate_method:
              settings.graph.simulate_method ?? 'forceatlas2',
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
        console.error(error);
        setAlert({
          show: true,
          message: 'Failed to fetch graph settings',
          color: 'red',
        });
      }
    }
    fetchGraphSettings();
  }, [reset, managementApi]);

  const onSubmit = async (data: GraphSettingsFormValues) => {
    try {
      await managementApi.managementSettingsCreate({
        requestBody: {
          graph: {
            simulate_method: data.simulate_method,
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
      setAlert({
        show: true,
        message: 'Graph settings updated successfully!',
        color: 'green',
      });
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
      await managementApi.managementActionsCreate({
        actionName: ManagementActionsCreateActionNameEnum.RefreshMaterializedGraph,
      });
      setAlert({
        show: true,
        message: 'Refresh Materialized Graph action triggered!',
        color: 'green',
      });
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
      // Cast to any because 'recalculateNodePositions' is missing in the generated enum
      // but is supported by the backend
      await managementApi.managementActionsCreate({
        actionName: 'recalculateNodePositions' as any,
      });
      setAlert({
        show: true,
        message: 'Re-calculate Node Positions action triggered!',
        color: 'green',
      });
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl px-4">
        <h1 className="text-center text-xl font-bold text-primary mb-4">
          Graph Simulation Settings
        </h1>
        <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mb-3">
            <Tabs
              tabClass={TabClasses.PILL}
            >
              <Tab title="Simulation Settings">
                <div className="flex flex-col gap-3 pt-2">
                  <div className="w-full mt-4">
                    <label className="block text-sm font-medium">
                      Simulation Method
                    </label>
                    <div className="mt-1">
                      <select
                        className="form-select select select-ghost-primary select-block focus:ring-0"
                        {...register('simulate_method')}
                      >
                        <option value="forceatlas2">
                          ForceAtlas2
                        </option>
                        <option value="graph_tool">
                          Graph Tool
                        </option>
                      </select>
                    </div>
                    {errors.simulate_method && (
                      <p className="text-red-600 text-sm">
                        {errors.simulate_method.message}
                      </p>
                    )}
                  </div>
                  {watch('simulate_method') === 'forceatlas2' && (
                    <>
                      <FormField
                        type="checkbox"
                        row={true}
                        id="dissuade_hubs"
                        label="Dissuade Hubs"
                        className="form-input switch switch-ghost-primary"
                        {...register('dissuade_hubs')}
                        error={errors.dissuade_hubs}
                      />
                      <FormField
                        type="checkbox"
                        row={true}
                        id="lin_log_mode"
                        label="LinLog Mode"
                        className="form-input switch switch-ghost-primary"
                        {...register('lin_log_mode')}
                        error={errors.lin_log_mode}
                      />
                      <FormField
                        type="checkbox"
                        row={true}
                        id="adjust_sizes"
                        label="Adjust Sizes (Prevent Overlap)"
                        className="form-input switch switch-ghost-primary"
                        {...register('adjust_sizes')}
                        error={errors.adjust_sizes}
                      />
                      <FormField
                        type="number"
                        step="0.01"
                        id="jitter_tolerance"
                        label="Jitter Tolerance"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('jitter_tolerance')}
                        error={errors.jitter_tolerance}
                      />
                      <FormField
                        type="checkbox"
                        row={true}
                        id="barnes_hut_optimize"
                        label="Barnes-Hut Optimize"
                        className="form-input switch switch-ghost-primary"
                        {...register('barnes_hut_optimize')}
                        error={
                          errors.barnes_hut_optimize?.message
                        }
                      />
                      <FormField
                        type="number"
                        step="0.01"
                        id="barnes_hut_theta"
                        label="Barnes-Hut Theta"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('barnes_hut_theta')}
                        error={errors.barnes_hut_theta}
                      />
                      <FormField
                        type="number"
                        step="0.01"
                        id="scaling_ratio"
                        label="Scaling Ratio"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('scaling_ratio')}
                        error={errors.scaling_ratio}
                      />
                      <FormField
                        type="checkbox"
                        row={true}
                        id="strong_gravity_mode"
                        label="Strong Gravity Mode"
                        className="form-input switch switch-ghost-primary"
                        {...register('strong_gravity_mode')}
                        error={
                          errors.strong_gravity_mode?.message
                        }
                      />
                      <FormField
                        type="number"
                        step="0.01"
                        id="gravity"
                        label="Gravity Coefficient"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('gravity')}
                        error={errors.gravity}
                      />
                      <FormField
                        type="number"
                        step="10"
                        id="max_iter_fa2"
                        label="Max Iterations"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('max_iter_fa2')}
                        error={errors.max_iter_fa2?.message}
                      />
                    </>
                  )}

                  {watch('simulate_method') === 'graph_tool' && (
                    <>
                      <FormField
                        type="number"
                        id="K"
                        label="Edge Length Constant (K)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('K')}
                        error={errors.K}
                      />
                      <FormField
                        type="number"
                        id="p"
                        label="Repulsive Force Strength (p)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('p')}
                        error={errors.p}
                      />
                      <FormField
                        type="number"
                        step="0.01"
                        id="theta"
                        label="Tradeoff Between Speed and Precision (theta)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('theta')}
                        error={errors.theta}
                      />
                      <FormField
                        type="number"
                        id="max_level"
                        label="Max Level (for Multilevel Optimization)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('max_level')}
                        error={errors.max_level}
                      />
                      <FormField
                        type="number"
                        id="r"
                        label="r (Attractive Force Between Connected Components)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('r')}
                        error={errors.r}
                      />
                      <FormField
                        type="number"
                        step="0.001"
                        id="epsilon"
                        label="Convergence Precision (epsilon)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('epsilon')}
                        error={errors.epsilon}
                      />
                      <FormField
                        type="number"
                        id="max_iter_gt"
                        label="Maximum Iterations (max_iter)"
                        className="form-input input input-ghost-primary input-block focus:ring-0"
                        {...register('max_iter_gt')}
                        error={errors.max_iter_gt}
                      />
                    </>
                  )}
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </Tab>
              <Tab title="Actions">
                <div className="flex flex-col gap-2 pt-4">
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
          </form>
          <AlertBox alert={alert} />
        </div>
      </div>
    </div>
  );
}

