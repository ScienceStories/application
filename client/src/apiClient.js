import axios from "axios";

const GENERAL_ERROR_MESSAGE = "Internal Error. Please try again."
const axiosClient = axios.create({
  timeout: 20000,
  headers: { "Content-Type": "application/json" }
});

axiosClient.interceptors.request.use(
  function(config) {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = token;
    return config;
  },
  function(error) {
    console.log("req interceptor", error);
    return Promise.reject(error);
  }
);


axiosClient.parseError = (err) => {
  return err.response.data || GENERAL_ERROR_MESSAGE;
}
export default axiosClient;
