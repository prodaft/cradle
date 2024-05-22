<<<<<<< HEAD
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth/useAuth";
import { IconoirProvider } from "iconoir-react";

export default function Home() {
=======
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
>>>>>>> main
    const navigate = useNavigate();
    const auth = useAuth();

    const [navbarContents, setNavbarContents] = useState([]);

    const handleLogout = () => {
<<<<<<< HEAD
        auth.logOut();  
        localStorage.clear(); // TODO save unsaved notes as fleeting notes
        navigate("/login");
    };

    return (
        <IconoirProvider
            iconProps={{
                color: "#f68d2e",
                strokeWidth: 1,
                width: "1.7em",
                height: "1.7em",
            }}
        >
            <div className="flex flex-row w-full h-screen overflow-hidden">
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
                        handleFleetingNotes={() => {
                            navigate("/not-implemented");
                        }}
                        contents={navbarContents}
                    />
                    <div className="flex-grow overflow-y-auto">
                        <Outlet context={{ setNavbarContents }} />
                    </div>
                </div>
            </div>
        </IconoirProvider>
    );
}
=======
      auth.logOut();  
      navigate("/login");
    };

    const handleNotImplemented = () => {
        navigate("/not-implemented");
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
            <div className="flex flex-row w-full">
                <Sidebar handleLogout={handleLogout} handleNewNote={handleNewNote} handleGraphView={() => handleNotImplemented()} />
            <div className="flex flex-col w-full">
                <Navbar handleFleetingNotes={() => handleNotImplemented()} contents={navbarContents}/>
                <div className="w-full h-full">
                    <Outlet context={{setNavbarContents}}/>
                </div>
            </div>
            </div>
        </IconoirProvider>
    );
}

>>>>>>> main
