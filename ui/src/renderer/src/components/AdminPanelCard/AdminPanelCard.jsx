import { Trash, EditPencil, ClockRotateRight } from 'iconoir-react/regular';
import { Archive } from 'iconoir-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import {
    deleteArtifactClass,
    deleteEntry,
} from '../../services/adminService/adminService';
import { deleteUser } from '../../services/userService/userService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useAuth from '../../hooks/useAuth/useAuth';

export default function AdminPanelCard({
    name,
    id,
    description,
    type,
    onDelete,
    link,
    searchKey,
    typename,
}) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const auth = useAuth();

    const handleDelete = async () => {
        try {
            let response;
            if (type === 'entity') {
                response = await deleteEntry('entities', id);
            } else if (type === 'entrytype') {
                response = await deleteArtifactClass(id);
            } else {
                response = await deleteUser(id);
            }
            if (response.status === 200) {
                onDelete();
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleActivityClick = () => {
        if (type === 'user') {
            navigate(`/activity/${name}`);
        } else if (type === 'entity') {
            navigate(`/activity?content_type=entry&object_id=${id}`);
        } else {
            navigate(`/activity?content_type=entryclass&object_id=${id}`);
        }
    };

    const handleEditClick = () => {
        if (type === 'user') {
            navigate(`/account/${id}`);
        } else if (typename) {
            navigate(`/admin/edit/entity/${id}`);
        } else {
            navigate(`/admin/edit/entry-type/${id.replace('/', '--')}`);
        }
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title='Confirm Deletion'
                description='This is permanent'
                handleConfirm={handleDelete}
            />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <Link to={link}>
                        {type === 'entity' && (
                            <span className='text-zinc-500'>{`${typename}:`}</span>
                        )}
                        {name}
                    </Link>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    {auth?.isAdmin() && (
                        <button
                            className='btn btn-ghost w-fit h-full p-1'
                            onClick={handleActivityClick}
                        >
                            <ClockRotateRight />
                        </button>
                    )}
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={handleEditClick}
                    >
                        <EditPencil />
                    </button>
                    {auth?.isAdmin() && (
                        <button
                            className='btn btn-ghost w-fit h-full p-1'
                            onClick={() => setDialog((prev) => !prev)}
                        >
                            {type === 'entity' ? <Archive /> : <Trash />}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
