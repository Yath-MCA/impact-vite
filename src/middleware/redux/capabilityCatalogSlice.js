import { createSlice } from '@reduxjs/toolkit';

const capabilityCatalogSlice = createSlice({
  name: 'capabilityCatalog',
  initialState: { loading: true, document: null },
  reducers: {
    capabilityCatalogRequested(state) {
      state.loading = true;
    },
    capabilityCatalogLoaded(state, action) {
      state.loading = false;
      state.document = action.payload;
    }
  }
});

export const { capabilityCatalogRequested, capabilityCatalogLoaded } = capabilityCatalogSlice.actions;
export default capabilityCatalogSlice.reducer;
