import {
    configureStore,
    createSlice
} from '@reduxjs/toolkit';

// Example slice
const panelSlice = createSlice({
    name: 'panel',
    initialState: {
        content: ''
    },
    reducers: {
        setContent: (state, action) => {
            state.content = action.payload;
        }
    }
});

export const {
    setContent
} = panelSlice.actions;

export const store = configureStore({
    reducer: {
        panel: panelSlice.reducer
    }
});