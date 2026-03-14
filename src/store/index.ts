import { configureStore } from "@reduxjs/toolkit";
import { destinationsApi } from "./api/destinationsApi";
import { routesApi } from "./api/routesApi";
import { bookingApi } from "./api/bookingApi";
import { miscApi } from "./api/miscApi";

export const store = configureStore({
  reducer: {
    [destinationsApi.reducerPath]: destinationsApi.reducer,
    [routesApi.reducerPath]: routesApi.reducer,
    [bookingApi.reducerPath]: bookingApi.reducer,
    [miscApi.reducerPath]: miscApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      destinationsApi.middleware,
      routesApi.middleware,
      bookingApi.middleware,
      miscApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
