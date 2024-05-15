import {Link, useNavigate} from "react-router-dom";
import React, {useState} from "react";
import {registerReq} from "../../services/authReqService/authReqService";
import FormField from "../FormField/FormField";
import AlertBox from "../AuthAlert/AlertBox";
import {createActor, createCase} from "../../services/adminService/adminService";
import {useAuth} from "../../hooks/useAuth/useAuth";

export default function AdminPanelAdd(props){
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const auth = useAuth();

    const handleSubmit = async () => {
        const data = {name: name, description: description};

        try{
            if(props.type === "Actor"){
                await createActor(data, auth.access);
            }else if (props.type === "Case") {
                await createCase(data, auth.access);
            }
            navigate("/admin");
        }catch (err) {
            if(err.response && err.response.status === 401){
                setError("Unauthorized");
            }else{
                setError("Network error");
            }
        }
    };

    return (
        <div className="flex flex-row items-center justify-center h-screen">
            <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3">
                <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
                    <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                        <h1 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2">
                            Add New {props.type}
                        </h1>
                    </div>
                    <div name="register-form" className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                        <div className="space-y-6" >
                            <input type="text" className="input input-ghost-primary input-block focus:ring-0"
                                   placeholder="Name" onChange={(e) => setName(e.target.value)}/>
                            <textarea className="textarea-ghost-primary textarea-block focus:ring-0 textarea"
                                      placeholder="Description" onChange={(e) => setDescription(e.target.value)}/>
                            {error && (<AlertBox title={error} text=""/>)}
                            <button
                                className="btn btn-success btn-block"
                                onClick={handleSubmit}
                            >
                                Add
                            </button>
                            <button
                                className="btn btn-error btn-block"
                                onClick={() => navigate("/admin")}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}