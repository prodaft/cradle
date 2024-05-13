import {useContext} from "react";
import {AuthContext} from "../utils/Auth/AuthProvider";

export const useAuth = () => {
    return useContext(AuthContext);
};