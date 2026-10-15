import { useEffect } from "react";

// Sends the browser to another Benna app (e.g. the store). Used for pages
// that live on store.benna.com.sa rather than in this standalone app.
const ExternalRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
};

export default ExternalRedirect;
