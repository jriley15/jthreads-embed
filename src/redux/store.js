import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import thunk from "redux-thunk";
import authState from "./reducers/authReducer";

const composeEnhancers =
  (typeof window !== "undefined" &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;
export default createStore(
  combineReducers({
    authState
  }),
  {},
  composeEnhancers(applyMiddleware(thunk))
);
