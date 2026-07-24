import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "@/lib/api";

function getVisitorId() {
  let id = localStorage.getItem("kiq-visitor-id");
  if (!id) {
    id = "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("kiq-visitor-id", id);
  }
  return id;
}

export default function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    api.post("/track/pageview", {
      path: location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      visitor_id: getVisitorId(),
    }).catch(() => {});
  }, [location.pathname]);
  return null;
}
