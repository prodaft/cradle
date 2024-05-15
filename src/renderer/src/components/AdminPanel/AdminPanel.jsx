import {useAuth} from "../../hooks/useAuth/useAuth";
import AdminPanelSection from "../AdminPanelSection/AdminPanelSection";
import {useNavigate} from "react-router-dom";

export default function AdminPanel() {
    const auth = useAuth();
    const navigate = useNavigate();

    const displayAgents = () => {
        return (
            <></>
        );
    }

    const displayCases = () => {
        return (
            <></>
        );
    }

    const displayUsers = () => {
        return (
            <></>
        );
    }

    if (!auth.isAdmin) return (<div>You are not an admin! How did you get here? Go back</div>);
    return (
        <div className="w-full h-[90vh] md:h-[93vh] lg:h-[95vh] xl:h-[95vh] rounded-md flex flex-row p-1.5 gap-1.5 overflow-x-hidden overflow-y-scroll">
            <AdminPanelSection title={"Actors"} addEnabled={true} addTooltipText={"Add Actor"} handleAdd={() => navigate("/admin/add-actor")}>
                {displayAgents()}
            </AdminPanelSection>
            <AdminPanelSection title={"Cases"} addEnabled={true} addTooltipText={"Add Case"} handleAdd={() => navigate("/admin/add-case")}>
                {displayCases()}
            </AdminPanelSection>
            <AdminPanelSection title={"Users"} addEnabled={false}>
                {displayUsers()}
            </AdminPanelSection>
        </div>
    );
}