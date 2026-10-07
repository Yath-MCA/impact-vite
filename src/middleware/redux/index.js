import { configureStore } from '@reduxjs/toolkit';
import modulesReducer from './modulesSlice.js';
import capabilityCatalogReducer from './capabilityCatalogSlice.js';

export const store = configureStore({
  reducer: {
    modules: modulesReducer,
    capabilityCatalog: capabilityCatalogReducer
  }
});
