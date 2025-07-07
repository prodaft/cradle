// Auto-registration with dynamic imports
export async function loadAllCmds() {
  await Promise.all([
    import('./HelloWorldCommand'),
  ]);
}


