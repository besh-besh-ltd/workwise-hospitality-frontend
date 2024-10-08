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

export const getProjectList = ()=> {
  return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.get(`project/name_list`);
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

export const updateProject = (projectId, payload)=> {
  return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.put(`project/update/${projectId}`, payload);
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
}

