import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import { bootstrap } from './store/slices/authSlice.js';
import App from './App.jsx';
import './styles/global.css';

// Hydrate auth from a stored token before first render resolves.
store.dispatch(bootstrap());

ReactDOM.createRoot(document.getElementById('root')).render(
 
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
 
);
