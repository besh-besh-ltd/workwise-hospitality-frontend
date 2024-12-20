import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

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

export const getProjectTableDataById = (projectId)=> {
  return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.get(`project/${projectId}`);
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
}

export const getProjectList = ()=> {
  return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.get(`project/name/list`);
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

export const uploadProjectFile = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/project/upload-file`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getProjectReportData = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.get(`/rfq/report/rfq-project-wise?projectId=${payload.projectId}&startDate=${payload.startDate}&endDate=${payload.endDate}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

};

export const getProductReportData = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.get(`/rfq/report/rfq-product-wise?productName=${payload.productName}&parentCategory=${payload.productCategory}&startDate=${payload.startDate}&endDate=${payload.endDate}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const sendReportOnEmail = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/rfq/report/send-on-email`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};