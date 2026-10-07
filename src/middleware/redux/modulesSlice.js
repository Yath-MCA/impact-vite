import { createSlice } from '@reduxjs/toolkit';

const MAX_TIMELINE = 100;

const initialState = {
  runtime: {
    activeModuleId: null,
    activeDialogId: null,
    lastAction: null,
    updatedAt: null
  },
  modules: {
    byId: {},
    openIds: []
  },
  timeline: []
};

function normalizeStats(stats = {}) {
  return {
    openCount: stats.openCount || 0,
    closeCount: stats.closeCount || 0,
    buttonClicks: { ...(stats.buttonClicks || {}) },
    inputInteractions: stats.inputInteractions || 0,
    lastOpened: stats.lastOpened || null,
    lastClosed: stats.lastClosed || null
  };
}

function ensureModule(state, id) {
  if (!state.modules.byId[id]) {
    state.modules.byId[id] = {
      id,
      name: null,
      dialogType: null,
      isOpen: false,
      initiated: false,
      errors: 0,
      lastError: null,
      stats: normalizeStats()
    };
  }
  return state.modules.byId[id];
}

function pushTimeline(state, entry) {
  state.timeline.push(entry);
  if (state.timeline.length > MAX_TIMELINE) {
    state.timeline.splice(0, state.timeline.length - MAX_TIMELINE);
  }
}

function touchRuntime(state, actionType) {
  state.runtime.lastAction = actionType;
  state.runtime.updatedAt = new Date().toISOString();
  return state.runtime.updatedAt;
}

const modulesSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    moduleInitialized(state, action) {
      const { id, name, dialogType } = action.payload;
      const mod = ensureModule(state, id);
      if (name !== undefined) mod.name = name;
      if (dialogType !== undefined) mod.dialogType = dialogType;
      mod.initiated = true;
      const timestamp = touchRuntime(state, 'module/initialized');
      pushTimeline(state, { type: 'module/initialized', moduleId: id, timestamp });
    },
    moduleOpened(state, action) {
      const { id } = action.payload;
      const mod = ensureModule(state, id);
      mod.isOpen = true;
      mod.stats.openCount += 1;
      mod.stats.lastOpened = new Date().toISOString();
      state.modules.openIds = state.modules.openIds.filter((existingId) => existingId !== id);
      state.modules.openIds.push(id);
      state.runtime.activeModuleId = mod.name || id;
      state.runtime.activeDialogId = id;
      const timestamp = touchRuntime(state, 'module/opened');
      pushTimeline(state, {
        type: 'module/opened',
        moduleId: id,
        origin: action.payload.origin || null,
        actor: action.payload.actor || null,
        timestamp
      });
    },
    moduleClosed(state, action) {
      const { id } = action.payload;
      const mod = ensureModule(state, id);
      mod.isOpen = false;
      mod.stats.closeCount += 1;
      mod.stats.lastClosed = new Date().toISOString();
      state.modules.openIds = state.modules.openIds.filter((existingId) => existingId !== id);
      if (state.runtime.activeDialogId === id) {
        const remaining = state.modules.openIds;
        state.runtime.activeDialogId = remaining.length ? remaining[remaining.length - 1] : null;
        state.runtime.activeModuleId = null;
      }
      const timestamp = touchRuntime(state, 'module/closed');
      pushTimeline(state, {
        type: 'module/closed',
        moduleId: id,
        origin: action.payload.origin || null,
        actor: action.payload.actor || null,
        timestamp
      });
    },
    buttonClicked(state, action) {
      const { id, buttonId } = action.payload;
      const mod = ensureModule(state, id);
      mod.stats.buttonClicks[buttonId] = (mod.stats.buttonClicks[buttonId] || 0) + 1;
      const timestamp = touchRuntime(state, 'module/buttonClicked');
      pushTimeline(state, { type: 'module/buttonClicked', moduleId: id, buttonId, timestamp });
    },
    inputInteracted(state, action) {
      const { id } = action.payload;
      const mod = ensureModule(state, id);
      mod.stats.inputInteractions += 1;
      const timestamp = touchRuntime(state, 'module/inputInteracted');
      pushTimeline(state, { type: 'module/inputInteracted', moduleId: id, timestamp });
    },
    errorRecorded(state, action) {
      const { id, functionName, message } = action.payload;
      const mod = ensureModule(state, id);
      mod.errors += 1;
      mod.lastError = { functionName: functionName || null, message: message || null, timestamp: new Date().toISOString() };
      const timestamp = touchRuntime(state, 'module/errorRecorded');
      pushTimeline(state, { type: 'module/errorRecorded', moduleId: id, functionName: functionName || null, timestamp });
    }
  }
});

export const {
  moduleInitialized,
  moduleOpened,
  moduleClosed,
  buttonClicked,
  inputInteracted,
  errorRecorded
} = modulesSlice.actions;

export default modulesSlice.reducer;
