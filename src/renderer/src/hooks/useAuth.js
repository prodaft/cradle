import {useContext} from "react";
import {AuthContext} from "../utils/Auth/AuthProvider";

export const useAuth = () => {
    // eslint-disable-next-line no-undef
    return useContext(AuthContext);
};