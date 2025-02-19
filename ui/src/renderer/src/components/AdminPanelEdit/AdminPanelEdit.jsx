import { useNavigate, useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { getEntities, getEntryClasses } from '../../services/adminService/adminService';
import {
    editEntity,
    editArtifactClass,
} from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { SketchPicker } from 'react-color';
import { PopoverPicker } from '../PopoverPicker/PopoverPicker';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';

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
    const [prefix, setPrefix] = useState('');
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
                        let entrytype = types.find((obj) => obj.subtype === id);
                        if (entrytype) {
                            setCatalystType(entrytype.catalyst_type);
                            setSubtype(entrytype.subtype);
                            setName(entrytype.subtype);
                            setClassType(entrytype.type);
                            setColor(entrytype.color);
                            if (entrytype.regex && entrytype.regex.length > 0) {
                                setTypeFormat('regex');
                                setTypeFormatDetails(entrytype.regex);
                            } else if (entrytype.options && entrytype.options.length > 0) {
                                setTypeFormat('options');
                                setTypeFormatDetails(entrytype.options);
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
                data.subtype = name;
                data.color = color;
                data.prefix = prefix;
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
                                <FormField
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    labelText='Name'
                                    value={name}
                                    disabled
                                />

                                <div className='w-full'>
                                    <label
                                        htmlFor='subtype'
                                        className='block text-sm font-medium leading-6'
                                    >
                                        Subtype
                                    </label>
                                    <div className='mt-2'>
                                        <select
                                            className='form-select select select-ghost-primary select-block focus:ring-0'
                                            name='subtype'
                                            value={subtype}
                                            disabled
                                        >
                                            <option value={subtype}>{subtype}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <label
                                        htmlFor='description'
                                        className='block text-sm font-medium leading-6'
                                    >
                                        Description
                                    </label>
                                    <div className='mt-2'>
                                        <textarea
                                            className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                            name='description'
                                            placeholder='Description'
                                            onChange={(e) =>
                                                setDescription(e.target.value)
                                            }
                                            value={description}
                                            autoFocus
                                        />
                                    </div>
                                </div>
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
          <>
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

                                <FormField
                                    name='name'
                                    type='text'
                                    labelText='Name'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    value={name}
                                    handleInput={setName}
                                />
                                <FormField
                                    name='catalyst_type'
                                    labelText='Catalyst Type'
                                    type='text'
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    placeholder='type/subtype|model_class|level'
                                    value={catalystType}
                                    handleInput={setCatalystType}
                                />
                                {classType == 'entity' && (
                                    <FormField
                                        type='text'
                                        name='prefix'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        labelText='Prefix'
                                        handleInput={setPrefix}
                                        value={prefix}
                                    />
                                )}

                                {classType == 'artifact' && (
                                    <div className='w-full'>
                                        <label
                                            htmlFor='format'
                                            className='block text-sm font-medium leading-6'
                                        >
                                            Format
                                        </label>
                                        <div className='mt-2'>
                                            <select
                                                className='form-select select select-ghost-primary select-block focus:ring-0'
                                                onChange={handleFormatChange}
                                                value={typeFormat}
                                                name='format'
                                            >
                                                <option>Any Format</option>
                                                <option value='options'>
                                                    Enumerator
                                                </option>
                                                <option value='regex'>Regex</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <textarea
                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                    placeholder={typeFormatHint}
                                    onChange={(e) =>
                                        setTypeFormatDetails(e.target.value)
                                    }
                                    value={typeFormatDetails}
                                    hidden={
                                        classType != 'artifact' || typeFormat == null
                                    }
                                />

                                <div className='w-full'>
                                    <label
                                        htmlFor='color'
                                        className='block text-sm font-medium leading-6'
                                    >
                                        Color
                                    </label>
                                    <div className='mt-2'>
                                        <PopoverPicker
                                            color={color}
                                            onChange={setColor}
                                        />
                                    </div>
                                </div>

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
          </>
        );
    }
}
