import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/Auth/AuthProvider";
import axios from 'axios';
import Cookies from "js-cookie"




export default function Home(){
    const navigate = useNavigate();
    const auth = useAuth();

    const logout = () => {
        console.log(Cookies.get());
        axios({
            method: "post",
            url: "http://127.0.0.1:8000/users/logout/",
            withCredentials:true,
            headers: {
              "Content-Type":"application/json",
              "X_CSRFTOKEN":auth.csrftoken,
            }
          }).then((res)=>{
            if(res.status === 200){
              auth.logOut();
            }
          }).catch(function (res) {
            console.log("Error happened");
          });
        navigate("/login");
    };
    return (
    <>
        <h1>Home</h1>
        <h2>Session: {auth.sessionid}</h2>
        <h2>CSRF Token: {auth.csrftoken}</h2>
        <button onClick={logout}>
            Logout
        </button>
    </>    
    );
}