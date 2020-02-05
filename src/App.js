import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Thread from "./Thread";
import { CookiesProvider } from "react-cookie";
import { Provider } from "react-redux";
import store from "./redux/store";
import Embed from "./Embed";

function App() {
  return (
    <Provider store={store}>
      <CookiesProvider>
        <Router>
          <Switch>
            <Route exact path="/*" component={Thread} />
            {/*<Route path="/embed" component={Embed} />*/}
          </Switch>
        </Router>
      </CookiesProvider>
    </Provider>
  );
}

export default App;
