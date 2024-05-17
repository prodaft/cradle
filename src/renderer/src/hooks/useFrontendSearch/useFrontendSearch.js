import {useEffect, useState} from "react";

const useFrontendSearch = (children) => {
    const [searchVal, setSearchVal] = useState("");
    const [filteredChildren, setFilteredChildren] = useState(children);

    useEffect(() => {
        if (searchVal === "") {
            setFilteredChildren(children);
        } else {
            const filtered = children.filter((child) =>
                child.props.searchKey.toLowerCase().includes(searchVal.toLowerCase())
            );
            setFilteredChildren(filtered);
        }
    }, [searchVal, children]);

    return { searchVal, setSearchVal, filteredChildren };
};

export default useFrontendSearch;