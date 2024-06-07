import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";
import {useCallback, useMemo, useState} from "react";
import { useAuth } from "../../hooks/useAuth/useAuth";
import { IconoirProvider } from "iconoir-react";
import FleetingNotesPanel from "../FleetingNotesPanel/FleetingNotesPanel";

/**
 * The Home component is the main component of the application. It is composed of the Sidebar, Navbar, Fleeting-notes panel, and the Outlet.
 * The Outlet is where the different components of the application are rendered based on the current route.
 * The Navbar is used to access different functionalities of the application.
 * The Sidebar is used to navigate between different sections of the application.
 * The fleeting-notes panel is used to display the fleeting notes.
 * The Home component also handles the state of the Navbar and the FleetingNotesPanel.
 *
 * @returns {Home}
 * @constructor
 */
export default function Home() {
    const navigate = useNavigate();
    const auth = useAuth();
    const [showFleetingNotes, setShowFleetingNotes] = useState(false);
    const [fleetingNotesRefreshCount, setFleetingNotesRefreshCount] = useState(0);

    const [navbarContents, setNavbarContents] = useState([]);

    const handleLogout = () => {
        auth.logOut();  
        localStorage.clear(); // TODO save unsaved notes as fleeting notes
        navigate("/login");
    };

    const switchFleetingNotes = () => {
        setShowFleetingNotes(!showFleetingNotes);
    }

    const refreshFleetingNotes = useCallback(() => {
        setFleetingNotesRefreshCount(prevCount => prevCount + 1);
    }, []);

    const memoizedNavbarContents = useMemo(() => navbarContents, [navbarContents]);

    return (
        <IconoirProvider
            iconProps={{
                color: "#f68d2e",
                strokeWidth: 1,
                width: "1.7em",
                height: "1.7em",
            }}
        >
            <div className="flex flex-row w-screen h-screen overflow-hidden">
                <Sidebar
                    handleLogout={handleLogout}
                    handleAdminPanel={() => {
                        navigate("/admin");
                    }}
                    handleNewNote={() => {
                        navigate("/editor");
                    }}
                    handleGraphView={() => {
                        navigate("/not-implemented");
                    }}
                />
                <div className="flex flex-col w-full h-full">
                    <Navbar
                        showFleetingNotesButton={!showFleetingNotes}
                        handleFleetingNotesButton={switchFleetingNotes}
                        contents={memoizedNavbarContents}
                    />
                    <div className="flex-grow overflow-y-auto w-full">
                        <Outlet context={{setNavbarContents,refreshFleetingNotes}}/>
                    </div>
                </div>
                <div
                    className={`transition-all duration-300 ${showFleetingNotes ? 'w-full lg:w-1/2 xl:w-1/3' : 'w-0'} overflow-hidden`}>
                    {showFleetingNotes && <FleetingNotesPanel
                        handleFleetingNotesButton={switchFleetingNotes}
                        fleetingNotesRefresh={fleetingNotesRefreshCount}
                    />}
                </div>
            </div>
        </IconoirProvider>
    );
}
