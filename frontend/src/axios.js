import axios from "axios";

axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL;
axios.defaults.withCredentials = true;

// optional safety defaults
axios.defaults.headers.common["Content-Type"] = "application/json";

export default axios;
