import React, { useState } from "react";
import { UserCircle } from "iconoir-react";
import LoginRegisterField from "../LoginRegisterField/LoginRegisterField";
import LoginRegisterButton from "../LoginRegisterButton/LoginRegisterButton";
import {Link} from "react-router-dom"
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/Auth/AuthProvider";
import { logInReq } from "../../services/AuthService";
import AuthAlert from "../AuthAlert/AuthAlert";




export default function Login(props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const auth = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData(e.target);

    logInReq(data).then((res)=>{
        if(res.status === 200){
          auth.logIn(res.data["access"],res.data["refresh"])
        }
        navigate("/");
    }).catch(function (err) {
      if(err.response.status === 401){
        setError(true);
      }
      auth.logOut();
    });
  };

  return (
    <div className="flex flex-row items-center justify-center h-screen ">
      <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3">
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-gray-500">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <div className="flex flex-row  items-center justify-center">
              <UserCircle color="#f68d2e" height={120} width={120}/>
            </div>
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2">
              Welcome to CRADLE!
            </h2>
            <h3 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight ">
              Login
            </h3>
          </div>
          <div name="login-form" className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <LoginRegisterField name="username" labelText="Username" type="text" handleInput={setUsername}/>
              <LoginRegisterField name="password" labelText="Password" type="password" handleInput={setPassword}/>
              {error && (<AuthAlert title ="Invalid credentials" text=""/>)}
              <LoginRegisterButton labelText="Login"/>
            </form>
            <p className="mt-10 text-center text-sm text-gray-500">
              <Link to="/register" className="font-semibold leading-6 text-cradle2 hover:opacity-90 hover:shadow-gray-400">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
