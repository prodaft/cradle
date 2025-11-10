import { EditPencil } from 'iconoir-react/regular';
import { useNotif } from '../../contexts/NotificationContext/NotificationContext';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils.jsx';
import Card from '../Card/Card';
import TypeMappingsEditor from '../TypeMappingsEditor/TypeMappingsEditor.jsx';

export default function AdminPanelCardTypeMapping({ name, id, setRightPane }) {
    const { notify } = useNotif();

    const handleEditClick = () => {
        setRightPane(<TypeMappingsEditor id={id} onSave={(a) => { }} />);
    };

    const actions = [
        {
            icon: <EditPencil />,
            onClick: handleEditClick,
            tooltip: 'Edit',
            variant: 'ghost',
        },
    ];

    return (
        <>
            <Card
                title={capitalizeString(name)}
                actions={actions}
                onClick={handleEditClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
