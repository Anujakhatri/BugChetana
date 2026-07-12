import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/api/axiosInstance";
import { useAuth } from "./AuthContext";

const ProjectContext = createContext({
  currentProject : null,
  loadingProjects : false,
});

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [availableProjects, setAvailableProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errorProjects, setErrorProjects] = useState(null);

  useEffect(() => {
    if (user) {
      setLoadingProjects(true);
      api.get("/projects/")
        .then(res => {
          setAvailableProjects(res.data);
          if (res.data.length > 0) {
            setCurrentProject(res.data[0]);
          } else {
            setCurrentProject(null);
          }
        })
        .catch(err => {
          console.error("Failed to fetch projects", err);
          setErrorProjects("Failed to load projects");
        })
        .finally(() => setLoadingProjects(false));
    } else {
      setAvailableProjects([]);
      setCurrentProject(null);
      setLoadingProjects(false);
    }
  }, [user]);

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject, availableProjects, loadingProjects, errorProjects }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
