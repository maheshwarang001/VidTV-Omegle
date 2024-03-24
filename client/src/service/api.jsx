import axios from 'axios';

const getIP = async () => {
    try {
        const response = await axios.get('http://localhost:5500/get/ip');
        console.log("IP Data", response.data);

        if (response.data === null || response.data === undefined) {
            throw new Error("IP data is null or undefined");
        }
        return response.data;
    } catch (err) {
        console.log("Error Fetching data: ", err);
        throw err;
    }
};

export default getIP;
