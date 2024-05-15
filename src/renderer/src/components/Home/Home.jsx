import {Outlet, useNavigate} from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";
import {useState} from "react";
import {useAuth} from "../../hooks/useAuth/useAuth";
import {IconoirProvider} from "iconoir-react";


/**
 * Home component - the main component for the application.
 * Provides the main layout for the application - sidebar, navbar, and main content.
 * Sets default style for all icons in the application - any component that needs to change style of icons should ovverride the settings
 * @returns {JSX.Element}
 * @constructor
 */
export default function Home(){
    const navigate = useNavigate();
    const auth = useAuth();

    const [navbarContents, setNavbarContents] = useState([]);

    const handleLogout = () => {
      auth.logOut();  
      navigate("/login");
    };

    const handleNotImplemented = () => {
        navigate("/not-implemented");
    }

    const handleAdminPanel = () => {
        navigate("/admin");
    }

    const handleNewNote = () => {
        navigate("/editor");
    }

    return (
        <IconoirProvider
        iconProps={{
            color: '#f68d2e',
            strokeWidth: 1,
            width: '1.7em',
            height: '1.7em',
        }}>
            <div className="flex flex-row w-full overflow-hidden">
                <Sidebar handleLogout={handleLogout} handleAdminPanel={handleAdminPanel} handleNewNote={handleNewNote} handleGraphView={() => handleNotImplemented()} />
            <div className="w-full overflow-hidden overflow-y-hidden">
                <Navbar handleFleetingNotes={() => handleNotImplemented()} contents={navbarContents}/>
                <div className="w-full h-full overflow-x-hidden overflow-y-hidden">
                    <Outlet context={{setNavbarContents}}/>
                </div>
            </div>
            </div>
        </IconoirProvider>
    );
}

