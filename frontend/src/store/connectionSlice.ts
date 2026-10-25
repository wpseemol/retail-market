import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ConnectionState = {
  online: boolean;
};

const initialState: ConnectionState = { online: true };

const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.online = action.payload;
    },
  },
});

export const { setOnline } = connectionSlice.actions;
export default connectionSlice.reducer;

export function selectOnline(state: { connection: ConnectionState }) {
  return state.connection.online;
}
