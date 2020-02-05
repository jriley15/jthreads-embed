const initialState = {
  isAuthenticated: false,
  token: "",
  claims: {}
};

const authReducer = (state, action) => {
  state = state || initialState;

  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        claims: {
          email:
            action.payload[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
            ],
          id:
            action.payload[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
            ],
          name:
            action.payload[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
            ],
          expires: "exp",
          issuer: "iss"
        },
        isAuthenticated: true,
        token: action.token
      };

    case "LOGOUT":
      return {
        ...initialState
      };

    default:
      return state;
  }
};

export default authReducer;
