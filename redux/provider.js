import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';

const { Provider } = require('react-redux');

export function Providers({children}){
return <Provider store={store}><PersistGate loading={null} persistor={persistor}>{children}</PersistGate></Provider>
}