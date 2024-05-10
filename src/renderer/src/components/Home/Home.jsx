import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/Auth/AuthProvider";
import { logOutReq } from "../../services/AuthService";




export default function Home(){
    const navigate = useNavigate();
    const auth = useAuth();

    const handleLogout = () => {
      auth.logOut();  
      navigate("/login");
    };
    return (
    <>
        <h1>Home</h1>
        <h2>Access: {auth.access}</h2>
        <h2>Refresh: {auth.refresh}</h2>
        <button onClick={handleLogout}>
            Logout
        </button>
    </>    
    );
}