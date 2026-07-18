// Plain (non-.server) constants shared between server code and client components.
// Keep values here that the UI needs to render but that also gate server logic,
// so a route component can import them without pulling a .server module into the
// client bundle (which Vite blocks with "Server-only module referenced by client").

// Free-plan monthly cap on "request reviews from past buyers" blast sends.
export const FREE_MONTHLY_CAP = 200;
