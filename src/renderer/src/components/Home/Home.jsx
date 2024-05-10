import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/Auth/AuthProvider";
import { logOutReq } from "../../services/AuthService";




export default function Home(){
    const navigate = useNavigate();
    const auth = useAuth();

    const handleLogout = () => {
        logOutReq(auth).then((res)=>{
            if(res.status === 200){
              auth.logOut();
            }
            navigate("/login");
          }).catch(function (res) {
            console.log("Error happened");
          });
    };
    return (
    <>
        <h1>Home</h1>
        <h2>Session: {auth.sessionid}</h2>
        <h2>CSRF Token: {auth.csrftoken}</h2>
        <button onClick={handleLogout}>
            Logout
        </button>
    </>    
    );
}