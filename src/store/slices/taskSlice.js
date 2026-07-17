import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { groupsApi, tasksApi, organizationsApi } from '../../api/client.js';

export const fetchGroupTasks = createAsyncThunk('tasks/fetchForGroup', async ({ groupId, params }) => {
  const res = await groupsApi.tasks(groupId, params);
  return { groupId, tasks: res.tasks, pagination: res.pagination, counts: res.counts };
});

export const fetchMyTasks = createAsyncThunk('tasks/fetchMine', async ({ orgId, params }) => {
  const res = await organizationsApi.myTasks(orgId, params);
  return { tasks: res.tasks, pagination: res.pagination, counts: res.counts };
});

export const fetchTaskDetail = createAsyncThunk('tasks/fetchDetail', async (taskId) => {
  const res = await tasksApi.get(taskId);
  return res.task;
});

export const createTask = createAsyncThunk('tasks/create', async ({ groupId, ...payload }) => {
  const res = await groupsApi.createTask(groupId, payload);
  return { groupId, task: res.task };
});

export const updateTask = createAsyncThunk('tasks/update', async ({ taskId, ...payload }) => {
  const res = await tasksApi.update(taskId, payload);
  return res.task;
});

export const deleteTask = createAsyncThunk('tasks/delete', async ({ taskId, groupId }) => {
  await tasksApi.remove(taskId);
  return { taskId, groupId };
});

// Update a task in place across every list it may appear in.
const updateEverywhere = (state, task) => {
  const bucket = state.byGroup[task.groupId];
  if (bucket) {
    const i = bucket.items.findIndex((t) => t.id === task.id);
    if (i >= 0) bucket.items[i] = task;
  }
  const mine = state.myTasks.items.findIndex((t) => t.id === task.id);
  if (mine >= 0) state.myTasks.items[mine] = task;
  if (state.detail && state.detail.id === task.id) state.detail = task;
};

// Insert a new task at the top of its group list, or update if already present
// (deduped by id so a socket event + the create thunk can't double-insert).
const upsertInGroup = (state, task) => {
  const bucket = state.byGroup[task.groupId];
  if (!bucket) return;
  const i = bucket.items.findIndex((t) => t.id === task.id);
  if (i >= 0) bucket.items[i] = task;
  else {
    bucket.items.unshift(task);
    bucket.pagination.total += 1;
  }
};

const emptyCounts = { ALL: 0, OPEN: 0, COMPLETED: 0, CANCELLED: 0 };
const emptyList = () => ({
  items: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  counts: { ...emptyCounts },
});

const taskSlice = createSlice({
  name: 'tasks',
  initialState: { byGroup: {}, myTasks: emptyList(), detail: null },
  reducers: {
    // Live socket events. A new task inserts at the top of its group list.
    taskReceived: (state, action) => {
      upsertInGroup(state, action.payload);
    },
    taskUpdatedLive: (state, action) => {
      updateEverywhere(state, action.payload);
    },
    taskRemovedLive: (state, action) => {
      const bucket = state.byGroup[action.payload.groupId];
      if (bucket) bucket.items = bucket.items.filter((t) => t.id !== action.payload.id);
      state.myTasks.items = state.myTasks.items.filter((t) => t.id !== action.payload.id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroupTasks.fulfilled, (state, action) => {
        state.byGroup[action.payload.groupId] = {
          items: action.payload.tasks,
          pagination: action.payload.pagination,
          counts: action.payload.counts || { ...emptyCounts },
        };
      })
      .addCase(fetchMyTasks.fulfilled, (state, action) => {
        state.myTasks = {
          items: action.payload.tasks,
          pagination: action.payload.pagination,
          counts: action.payload.counts || { ...emptyCounts },
        };
      })
      .addCase(fetchTaskDetail.pending, (state) => {
        state.detail = null;
      })
      .addCase(fetchTaskDetail.fulfilled, (state, action) => {
        state.detail = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        upsertInGroup(state, action.payload.task);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        updateEverywhere(state, action.payload);
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const bucket = state.byGroup[action.payload.groupId];
        if (bucket) bucket.items = bucket.items.filter((t) => t.id !== action.payload.taskId);
        state.myTasks.items = state.myTasks.items.filter((t) => t.id !== action.payload.taskId);
      });
  },
});

export const { taskReceived, taskUpdatedLive, taskRemovedLive } = taskSlice.actions;
export default taskSlice.reducer;

const EMPTY = emptyList();
export const selectGroupTasks = (groupId) => (s) => s.tasks.byGroup[groupId]?.items || [];
export const selectGroupTasksPagination = (groupId) => (s) =>
  s.tasks.byGroup[groupId]?.pagination || EMPTY.pagination;
export const selectGroupTasksCounts = (groupId) => (s) =>
  s.tasks.byGroup[groupId]?.counts || EMPTY.counts;
export const selectMyTasks = (s) => s.tasks.myTasks.items;
export const selectMyTasksPagination = (s) => s.tasks.myTasks.pagination;
export const selectMyTasksCounts = (s) => s.tasks.myTasks.counts;
export const selectTaskDetail = (s) => s.tasks.detail;
