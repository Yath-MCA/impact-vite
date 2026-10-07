import { createSlice } from '@reduxjs/toolkit';

const pageMetaSlice = createSlice({
  name: 'pageMeta',
  initialState: { current: null },
  reducers: {
    setPageMeta(state, action) {
      state.current = action.payload;
    },
    clearPageMeta(state) {
      state.current = null;
    },
  },
});

export const { setPageMeta, clearPageMeta } = pageMetaSlice.actions;
export default pageMetaSlice.reducer;
