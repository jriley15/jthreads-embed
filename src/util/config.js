import JSON from "../config.json";

const configuration = () => {
  if (process.env.NODE_ENV === "production") {
    return JSON.production;
  }
  return JSON.local;
};

const config = configuration();

export default config;
