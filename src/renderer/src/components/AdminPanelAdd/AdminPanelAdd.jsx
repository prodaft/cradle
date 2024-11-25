import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import AlertBox from '../AlertBox/AlertBox';
import { getEntities, getEntryClasses } from '../../services/adminService/adminService';
import {
    createEntity,
    createArtifactClass,
} from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { PopoverPicker } from '../PopoverPicker/PopoverPicker';

/**
 * AdminPanelAdd component - This component is used to display the form for adding a new Entity.
 * The component contains the following fields:
 * - Name
 * - Description
 * When canceling or confirming the addition the user will be redirected to the AdminPanel.
 *
 * @function AdminPanelAdd
 * @param {Object} props - The props object
 * @param {string} props.type - The type of object to add. e.g. "Entity", "ArtifactType"
 * @returns {AdminPanelAdd}
 * @constructor
 */

export default function AdminPanelAdd({ type }) {
    const [name, setName] = useState('');
    const [catalystType, setCatalystType] = useState('');
    const [prefix, setPrefix] = useState('');
    const [classType, setClassType] = useState('artifact');
    const [subtype, setSubtype] = useState('');
    const [catalystTypeDisabled, setCatalystTypeDisabled] = useState('');
    const [color, setColor] = useState(
        Math.floor(Math.random() * 0x1000000)
            .toString(16)
            .padStart(6, 0),
    );
    const [description, setDescription] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [subclasses, setSubclasses] = useState([]);
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);
    const [typeFormat, setTypeFormat] = useState(null);
    const [typeFormatDetails, setTypeFormatDetails] = useState(null);
    const [typeFormatHint, setTypeFormatHint] = useState('');

    const populateSubclasses = async () => {
        getEntryClasses(true)
            .then((response) => {
                if (response.status === 200) {
                    let entities = response.data;
                    // Filter type == entity
                    let subclasses = entities.filter(
                        (entity) => entity.type == 'entity',
                    );
                    setSubclasses(subclasses);
                    if (subclasses.length > 0) setSubtype(subclasses[0].subtype);
                }
            })
            .catch(handleError);
    };

    const handleSubmit = async () => {
        var data = {
            type: classType,
            subtype: subtype,
            catalyst_type: catalystType,
        };

        if (typeFormat) {
            data[typeFormat] = typeFormatDetails;
        }

        try {
            if (type === 'Entity') {
                data.type = 'entity';
                data.name = name;
                data.description = description;
                await createEntity(data);
            } else if (type === 'EntryType') {
                data.color = color;
                data.prefix = prefix;
                await createArtifactClass(data);
            }
            navigate('/admin', { state: Date.now() });
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    const handleFormatChange = (e) => {
        switch (e.target.value) {
            case 'options':
                setTypeFormat('options');
                setTypeFormatHint(
                    'Please enter the possible values for the type, seperated by newlines.',
                );
                break;

            case 'regex':
                setTypeFormat('regex');
                setTypeFormatHint('Please enter the regex for the type in this area.');
                break;

            default:
                setTypeFormat(null);
        }
    };

    if (type === 'Entity') {
        useEffect(() => {
            populateSubclasses();
        }, []);

        return (
            <div className='flex flex-row items-center justify-center h-screen'>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                    <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                        <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                            <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                                Add New Entity
                            </h1>
                        </div>
                        <div
                            name='register-form'
                            className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'
                        >
                            <div className='space-y-6'>
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='Name'
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                                <select
                                    className='form-select select select-ghost-primary select-block focus:ring-0'
                                    onChange={(e) => setSubtype(e.target.value)}
                                    value={subtype}
                                >
                                    {subclasses &&
                                        subclasses.length > 0 &&
                                        subclasses.map((subclass) => (
                                            <option value={subclass.subtype}>
                                                {subclass.subtype}
                                            </option>
                                        ))}
                                </select>
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='Catalyst Type'
                                    value={catalystType}
                                    disabled={catalystTypeDisabled}
                                    onChange={(e) => setCatalystType(e.target.value)}
                                />
                                <textarea
                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                    placeholder='Description'
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                                <AlertBox alert={alert} />
                                <button
                                    className='btn btn-primary btn-block'
                                    onClick={handleSubmit}
                                >
                                    Add
                                </button>
                                <button
                                    className='btn btn-ghost btn-block'
                                    onClick={() => navigate('/admin')}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } else if (type === 'EntryType') {
        return (
            <div className='flex flex-row items-center justify-center h-screen'>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                    <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                        <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                            <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                                Add New Entry Type
                            </h1>
                        </div>
                        <div
                            name='register-form'
                            className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'
                        >
                            <div className='space-y-6'>
                                <select
                                    className='form-select select select-ghost-primary select-block focus:ring-0'
                                    onChange={(e) => setClassType(e.target.value)}
                                    value={classType}
                                >
                                    <option value='artifact'>Artifact</option>
                                    <option value='entity'>Entity</option>
                                </select>
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='Name'
                                    onChange={(e) => setSubtype(e.target.value)}
                                    autoFocus
                                />
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='Prefix'
                                    onChange={(e) => setPrefix(e.target.value)}
                                    autoFocus
                                />
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='Catalyst Type'
                                    onChange={(e) => setCatalystType(e.target.value)}
                                />

                                {classType == 'artifact' && (
                                    <select
                                        className='form-select select select-ghost-primary select-block focus:ring-0'
                                        onChange={handleFormatChange}
                                    >
                                        <option>Any Format</option>
                                        <option value='options'>Enumerator</option>
                                        <option value='regex'>Regex</option>
                                    </select>
                                )}
                                <textarea
                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                    placeholder={typeFormatHint}
                                    onChange={(e) =>
                                        setTypeFormatDetails(e.target.value)
                                    }
                                    hidden={typeFormat == null}
                                />

                                <PopoverPicker color={color} onChange={setColor} />
                                <AlertBox alert={alert} />
                                <button
                                    className='btn btn-primary btn-block'
                                    onClick={handleSubmit}
                                >
                                    Add
                                </button>
                                <button
                                    className='btn btn-ghost btn-block'
                                    onClick={() => navigate('/admin')}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
