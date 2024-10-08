import axiosInstance from "@/lib/axios";

export const getAllProjects = ()=> {
    return new Promise(async (resolve, reject) => {
        try {
          let response = await axiosInstance.get(`project`);
          resolve(response);
        } catch (error) {
          reject({ message: error });
        }
      });
}

export const getProjectById = (projectId, payload)=> {
  return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.post(`project/${projectId}`, payload);
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
}

export const createProject = (payload)=> {
    return new Promise(async (resolve, reject) => {
        try {
          let response = await axiosInstance.post(`project/create`, payload);
          resolve(response);
        } catch (error) {
          reject({ message: error });
        }
      });
}

