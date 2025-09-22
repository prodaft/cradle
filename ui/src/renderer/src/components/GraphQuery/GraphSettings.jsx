export default function GraphSettings({ graphStats, config, setConfig }) {

    return (
        <div className='px-8 pt-3'>
            <div className='flex flex-wrap gap-2 mt-2'>
                <span className='badge badge-outline-primary'>
                    Total Nodes: {graphStats.nodes}
                </span>
                <span className='badge badge-outline-primary'>
                    Total Edges: {graphStats.edges}
                </span>
            </div>
            {/* Search, clear, and reset layout controls removed */}
            <div className='mt-4 space-y-3 px-4'>
                {[
                    {
                        label: 'Node Size',
                        value: config.nodeRadiusCoefficient,
                        min: 0.5,
                        max: 3,
                        step: 0.1,
                        key: 'nodeRadiusCoefficient',
                    },
                    {
                        label: 'Link Width',
                        value: config.linkWidthCoefficient,
                        min: 0.5,
                        max: 2,
                        step: 0.1,
                        key: 'linkWidthCoefficient',
                    },
                    {
                        label: 'Gravity',
                        value: config.simulationGravity,
                        min: 0,
                        max: 1,
                        step: 0.05,
                        key: 'simulationGravity',
                    },
                    {
                        label: 'Repulsion',
                        value: config.simulationRepulsion,
                        min: 0.3,
                        max: 2,
                        step: 0.1,
                        key: 'simulationRepulsion',
                    },
                    {
                        label: 'Link Spring',
                        value: config.simulationLinkSpring,
                        min: 0,
                        max: 2,
                        step: 0.1,
                        key: 'simulationLinkSpring',
                    },
                    {
                        label: 'Link Distance',
                        value: config.simulationLinkDistance,
                        min: 0,
                        max: 20,
                        step: 1,
                        key: 'simulationLinkDistance',
                    },
                ].map(({ label, value, min, max, step, key }) => (
                    <div key={key} className='flex items-center gap-3'>
                        <label className='text-sm w-32 whitespace-nowrap'>{label}</label>
                        <input
                            type='range'
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    [key]: Number(e.target.value),
                                }))
                            }
                            className='range range-primary flex-1 max-w-[360px] md:max-w-[420px]'
                        />
                        <input
                            type='number'
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    [key]: Number(e.target.value),
                                }))
                            }
                            className='input input-sm w-16 ml-2'
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
