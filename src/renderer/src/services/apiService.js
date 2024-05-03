import axios from 'axios';

const fetchNumber = async () => {
    try {
        const response = await axios.get('http://localhost:8000/counter/read/');
        return response.data[0]["value"];
    } catch (error) {
        console.error('Error fetching data: ', error);
    }
};


const updateNumber = async () => {
    try {
        await axios.post('http://localhost:8000/counter/increase/', {});
    } catch (error) {
        console.error('Error creating data: ', error);
    }
};

export {fetchNumber,updateNumber};