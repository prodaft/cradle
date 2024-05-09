import React, { useState } from "react";
import user_circle from "../../assets/user_circle.svg";
import LoginRegisterField from "../LoginRegisterField/LoginRegisterField";
import LoginRegisterButton from "../LoginRegisterButton/LoginRegisterButton";
import {Link} from "react-router-dom"
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/Auth/AuthProvider";




export default function Login(props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const auth = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData(e.target);

    axios({
      method: "post",
      url: "http://127.0.0.1:8000/users/login/",
      data: data,
      withCredentials:true,
      headers: { "Content-Type": "multipart/form-data; charset=UTF-8" },
    }).then((res)=>{
        console.log(res.headers["csrftoken"]);
        console.log(res.headers["sessionid"]);
        if(res.status === 200){
          auth.logIn(res.headers["sessionid"],res.headers["csrftoken"])
        }else{
          console.log("Login failed with response" + res)
        }
        navigate("/");
    }).catch(function (res) {
      console.log("Login threw an error")
      auth.logOut();
      navigate("/");
    });
  };

  return (
    <div className="flex flex-row items-center justify-center h-screen ">
      <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3">
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-gray-500">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img
              className="mx-auto h-40 w-auto"
              src={user_circle}
              alt="Account icon"
            />
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2">
              Welcome to CRADLE!
            </h2>
            <h3 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight ">
              Login
            </h3>
          </div>

          <div name="login-form" className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <LoginRegisterField name="username" labelText="User name" type="text" handleInput={setUsername}/>
              <LoginRegisterField name="password" labelText="Password" type="password" handleInput={setPassword}/>
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
