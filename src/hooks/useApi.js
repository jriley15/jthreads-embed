import useAuth from "./useAuth";
import Axios from "axios";
import { formatErrorResponse } from "../util/errorHelper";
import config from "../util/config";

export default function useApi() {
  const { token } = useAuth();
  const { api } = config;

  const post = async (url, body) => {
    let headers = {
      "Content-Type": "application/json"
    };

    if (token) {
      headers = { ...headers, Authorization: "Bearer " + token };
    }

    let response = {};

    await Axios.post(api + url, body, {
      headers: headers,
      withCredentials: true
    })
      .then(res => {
        response = res.data;
      })
      .catch(error => {
        response = formatErrorResponse(error);
      });

    return response;
  };

  const get = async (url, params) => {
    let headers = {};

    if (token) {
      headers = { Authorization: "Bearer " + token };
    }

    let response = {};

    await Axios.get(api + url, {
      params: params,
      headers: headers,
      withCredentials: true
    })
      .then(res => {
        response = res.data;
      })
      .catch(error => {
        response = formatErrorResponse(error);
      });

    return response;
  };

  return { get, post };
}
