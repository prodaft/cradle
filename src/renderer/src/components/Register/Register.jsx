import React, { useState } from "react";
import FormField from "../FormField/FormField";
import {Link} from "react-router-dom"
import { registerReq } from "../../services/authReqService/authReqService";
import AlertBox from "../AuthAlert/AlertBox";
import { useNavigate } from "react-router-dom";



export default function Register(props){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
      e.preventDefault();

      const data = {username: username, password: password};
      
      registerReq(data).then(function (response) {
        navigate("/login")
      })
      .catch(function (err) {
        if(err.response && err.response.status === 400){
          setError("Username already in use");
        }else{
            setError("Network error");
        }
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
                      <FormField name="username" labelText="Username" type="text" handleInput={setUsername}/>
                      <FormField name="password" labelText="Password" type="password"
                                 handleInput={setPassword}/>
                      {error && (<AlertBox title={error} text=""/>)}
                      <button
                          type="submit"
                          data-testid="login-register-button"
                          className="btn btn-primary btn-block"
                      >
                          Register
                      </button>
                  </form>
                  <p className="mt-10 text-center text-sm text-gray-500">
                      <Link to="/login"
                            className="font-semibold leading-6 text-cradle2 hover:opacity-90 hover:shadow-gray-400">
                      Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
} 