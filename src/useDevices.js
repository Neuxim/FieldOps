import { useEffect, useState } from "react";
import { getDevices } from "./api";

// Device registry: { devices, loading, error, reload }
export default function useDevices() {
  const [state, setState] = useState({ devices: [], loading: true, error: "" });
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDevices()
      .then((devices) => !cancelled && setState({ devices, loading: false, error: "" }))
      .catch((err) => !cancelled && setState({ devices: [], loading: false, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    setKey((k) => k + 1);
  };

  return { ...state, reload };
}
