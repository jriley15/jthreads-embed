import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Thread from "./components/Thread";
import { CookiesProvider } from "react-cookie";
import { Provider } from "react-redux";
import store from "./redux/store";

function App() {
  return (
    <Provider store={store}>
      <CookiesProvider>
        <Router>
          <Switch>
            <Route exact path="/*" component={Thread} />
          </Switch>
        </Router>
      </CookiesProvider>
    </Provider>
  );
}

export default App;
