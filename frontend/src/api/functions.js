// Functions stub — Deno functions server removed.
// Custom server-side functions will be implemented as Frappe whitelisted methods
// or n8n workflows, called through the Mojo Abstraction Layer.

const functionsClient = {
  call: async (name, ...args) => {
    console.warn(`[Functions Stub] ${name} called but not yet connected.`, args);
    return { success: false, stub: true };
  },
};

export default functionsClient;
