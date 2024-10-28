import { useNavigate, useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import AlertBox from '../AlertBox/AlertBox';
import { getEntities, getEntryClasses } from '../../services/adminService/adminService';
import {
    editEntity,
    editArtifactClass,
} from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { SketchPicker } from 'react-color';
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

export default function AdminPanelEdit({ type }) {
    var { id } = useParams();
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [classType, setClassType] = useState('artifact');
    const [subtype, setSubtype] = useState('');
    const [description, setDescription] = useState('');
    const [catalystType, setCatalystType] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);
    const [typeFormat, setTypeFormat] = useState(null);
    const [typeFormatDetails, setTypeFormatDetails] = useState(null);
    const [typeFormatHint, setTypeFormatHint] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false); // visibility for color picker

    if (type === 'EntryType') {
        id = id.replace('--', '/');
    }

    const populateEntityDetails = async () => {
        if (type === 'Entity') {
            getEntities()
                .then((response) => {
                    if (response.status === 200) {
                        let entities = response.data;
                        let entity = entities.find((obj) => obj.id === id);
                        if (entity) {
                            setSubtype(entity.subtype);
                            setName(entity.name);
                            setDescription(entity.description);
                            setCatalystType(entity.catalyst_type);
                        }
                    }
                })
                .catch(handleError);
        } else if (type === 'EntryType') {
            getEntryClasses()
                .then((response) => {
                    if (response.status === 200) {
                        let types = response.data;
                        let type = types.find((obj) => obj.subtype === id);
                        if (type) {
                            setCatalystType(type.catalyst_type);
                            setSubtype(type.subtype);
                            setName(type.subtype);
                            setClassType(type.type);
                            setColor(type.color);
                            if (type.regex && type.regex.length > 0) {
                                setTypeFormat('regex');
                                setTypeFormatDetails(type.regex);
                            } else if (type.options && type.options.length > 0) {
                                setTypeFormat('options');
                                setTypeFormatDetails(type.options);
                            } else {
                                setTypeFormat(null);
                            }
                        }
                    }
                })
                .catch(handleError);
        }
    };

    const handleSubmit = async () => {
        var data = { type: classType, subtype: subtype, catalyst_type: catalystType };

        if (typeFormat) {
            data[typeFormat] = typeFormatDetails;
        }

        try {
            if (type === 'Entity') {
                data.name = name;
                data.description = description;
                await editEntity(data, id);
            } else if (type === 'EntryType') {
                data.color = color;
                await editArtifactClass(data, id);
            }
            navigate('/admin');
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
            populateEntityDetails();
        }, []);

        return (
            <div className='flex flex-row items-center justify-center h-screen'>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                    <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                        <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                            <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                                Edit an Entity
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
                                    disabled
                                    value={name}
                                />

                                <select
                                    className='form-select select select-ghost-primary select-block focus:ring-0'
                                    disabled
                                    value={subtype}
                                >
                                    <option value={subtype}>{subtype}</option>
                                </select>
                                <textarea
                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                    placeholder='Description'
                                    onChange={(e) => setDescription(e.target.value)}
                                    value={description}
                                    autoFocus
                                />
                                <AlertBox alert={alert} />
                                <button
                                    className='btn btn-primary btn-block'
                                    onClick={handleSubmit}
                                >
                                    Edit
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
        useEffect(() => {
            populateEntityDetails();
        }, []);

        return (
            <div className='flex flex-row items-center justify-center h-screen'>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                    <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                        <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                            <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                                Edit Entry Type
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
                                    <option value='entity'>Entity</option>
                                    <option value='artifact'>Artifact</option>
                                </select>
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    value={name}
                                    disabled
                                />
                                <input
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='Catalyst Type'
                                    value={catalystType}
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
                                    value={typeFormatDetails ? typeFormatDetails : ''}
                                />

                                <PopoverPicker color={color} onChange={setColor} />

                                <AlertBox alert={alert} />
                                <button
                                    className='btn btn-primary btn-block'
                                    onClick={handleSubmit}
                                >
                                    Edit
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
