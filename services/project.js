import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

export const getAllProjects = ()=> {
    return new Promise(async (resolve, reject) => {
        try {
          // Add timestamp parameter to prevent caching
          const timestamp = new Date().getTime();
          let response = await axiosInstance.get(`project?t=${timestamp}`);
          
          // Check the structure of the response
          if (response.data) {
            // If the data is already an array, wrap it properly
            if (Array.isArray(response.data)) {
              // Modify the response to match the expected format
              response.data = {
                status: true,
                data: response.data
              };
            } else if (response.data.data) {
              // The response already has the correct structure
            } else {
              // Ensure we have a consistent format even with unexpected data
              response.data = {
                status: true,
                data: []
              };
            }
          } else {
            // Empty response, ensure consistent format
            response.data = {
              status: true,
              data: []
            };
          }
          
          resolve(response);
        } catch (error) {
          reject({ message: error });
        }
      });
}

export const getProjectById = (projectId, payload)=> {
  return new Promise(async (resolve, reject) => {
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const queryParams = payload ? `?t=${timestamp}` : `?t=${timestamp}`;
        let response = await axiosInstance.post(`project/${projectId}${queryParams}`, payload || {});
        
        // Ensure response format is consistent
        if (response.data) {
          if (!response.data.status && !response.data.message) {
            // This might be a direct data array without status wrapper
            response.data = {
              status: true,
              data: response.data
            };
          }
        }
        
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
}

export const getProjectTableDataById = (projectId)=> {
  return new Promise(async (resolve, reject) => {
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        let response = await axiosInstance.get(`project/${projectId}?t=${timestamp}`);        
        // Ensure response format is consistent
        if (response.data) {
          if (!response.data.status && !response.data.message) {
            // This might be a direct data array without status wrapper
            response.data = {
              status: true,
              data: response.data
            };
          }
        }
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
      let response = await axiosFormData.get(`/rfq/report/rfq-product-wise?productId=${payload.productId}&productName=${payload.productName}&parentCategory=${payload.productCategory}&startDate=${payload.startDate}&endDate=${payload.endDate}`);
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

export const getProjectTeamMembers = (projectId) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      let response = await axiosInstance.get(`project/${projectId}/team?t=${timestamp}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addTeamMember = (projectId, memberData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`project/${projectId}/team`, memberData);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const removeTeamMember = (projectId, memberId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.delete(`project/${projectId}/team/${memberId}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};