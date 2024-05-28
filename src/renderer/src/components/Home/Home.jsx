import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth/useAuth";
import { IconoirProvider } from "iconoir-react";

export default function Home() {
    const navigate = useNavigate();
    const auth = useAuth();

    const [navbarContents, setNavbarContents] = useState([]);

    const handleLogout = () => {
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
                        handleFleetingNotes={() => {
                            navigate("/not-implemented");
                        }}
                        contents={navbarContents}
                    />
                    <div className="flex-grow overflow-y-auto w-full">
                        <Outlet context={{ setNavbarContents }} />
                    </div>
                </div>
            </div>
        </IconoirProvider>
    );
}
