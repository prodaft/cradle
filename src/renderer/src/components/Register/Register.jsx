import React, { useState } from "react";
import LoginRegisterField from "../LoginRegisterField/LoginRegisterField";
import LoginRegisterButton from "../LoginRegisterButton/LoginRegisterButton";
import {Link} from "react-router-dom"
import axios from "axios";


export default function Register(props){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      axios({
        method: "post",
        url: "http://127.0.0.1:8000/users/",
        data: data,
        headers: { "Content-Type": "multipart/form-data" },
      })
        .then(function (response) {
          //handle success
          console.log(response);
        })
        .catch(function (response) {
          //handle error
          console.log(response);
        });
    };

    return (
        <div className="flex flex-row items-center justify-center h-screen">
          <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3">
            <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h1 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2">
                  Register
                </h1>
              </div>
              <div name="register-form" className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                <LoginRegisterField name="username" labelText="User name" type="text" handleInput={setUsername}/>
                <LoginRegisterField name="password" labelText="Password" type="password" handleInput={setPassword}/>
                <LoginRegisterButton labelText="Register"/>
                </form>
                <p className="mt-10 text-center text-sm text-gray-500">
                  <Link to="/login" className="font-semibold leading-6 text-cradle2 hover:opacity-90 hover:shadow-gray-400">
                    Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
} 