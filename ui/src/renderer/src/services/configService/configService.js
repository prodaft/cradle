export const getBaseUrl = () => {
  return localStorage.getItem('backendUrl') || import.meta.env.VITE_API_BASE_URL;
};
