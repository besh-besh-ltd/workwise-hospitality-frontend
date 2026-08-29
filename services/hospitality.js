import axiosInstance from "@/lib/axios";

export const getHospitalityCompanies = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/hospitality/companies`, { params });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getHospitalityEntities = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/hospitality/entities`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createHospitalityCompany = (payload, files = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
          formData.append(key, payload[key]);
        }
      });
      
      // Add files
      if (files.gst) formData.append('gst', files.gst);
      if (files.pan) formData.append('pan', files.pan);
      if (files.cancelled_cheque) formData.append('cancelled_cheque', files.cancelled_cheque);
      if (files.msme) formData.append('msme', files.msme);
      
      const response = await axiosInstance.post(
        `/hospitality/company`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateHospitalityCompany = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put(
        `/hospitality/company/${companyId}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getHospitalityHotels = (companyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/hotels`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createHospitalityHotel = (companyId, payload, files = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
          formData.append(key, payload[key]);
        }
      });
      
      // Add files
      if (files.gst) formData.append('gst', files.gst);
      if (files.pan) formData.append('pan', files.pan);
      if (files.cancelled_cheque) formData.append('cancelled_cheque', files.cancelled_cheque);
      if (files.msme) formData.append('msme', files.msme);
      
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/hotels`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateHospitalityHotel = (companyId, hotelId, payload, files = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
          formData.append(key, payload[key]);
        }
      });
      
      // Add files
      if (files.gst) formData.append('gst', files.gst);
      if (files.pan) formData.append('pan', files.pan);
      if (files.cancelled_cheque) formData.append('cancelled_cheque', files.cancelled_cheque);
      if (files.msme) formData.append('msme', files.msme);
      
      const response = await axiosInstance.put(
        `/hospitality/company/${companyId}/hotels/${hotelId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createHOBusinessUnit = (companyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/create-ho`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getHotelDocuments = (hotelId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/hotels/${hotelId}/documents`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const mapHospitalityUsers = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/map-users`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const mapHospitalityProjects = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/map-projects`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getCompanyUserMappings = (
  companyId,
  { mappingType, hotelId, includeAll } = {}
) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams();
      if (mappingType !== undefined && mappingType !== null) {
        params.append('mapping_type', mappingType);
      }
      if (hotelId) {
        params.append('hotel_id', hotelId);
      }
      if (includeAll) {
        params.append('include_all', 'true');
      }

      const queryString = params.toString();
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/user-mappings${
          queryString ? `?${queryString}` : ''
        }`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMappedUserIds = (companyId, mappingType, hotelId = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams({ mapping_type: mappingType });
      if (hotelId) params.append('hotel_id', hotelId);
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/mapped-user-ids?${params.toString()}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMappedProjectIds = (companyId, mappingType, hotelId = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams({ mapping_type: mappingType });
      if (hotelId) params.append('hotel_id', hotelId);
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/mapped-project-ids?${params.toString()}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getProjectMappings = (projectId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/project/${projectId}/mappings`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });


  // fetch mapped hotels for a given RFQ
export const getRFQHotels = (rfqId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/rfq-hotels/${rfqId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });


export const deleteProjectMapping = (projectId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/hospitality/project/${projectId}/mapping`,
        { data: payload }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getUserMappingsById = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/hospitality/user/${userId}/mappings`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const deleteUserMapping = (userId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/hospitality/user/${userId}/mapping`,
        { data: payload }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMyHospitalityContexts = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/hospitality/my-contexts`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getAllHotels = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/public/hotels`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const sendHotelPaymentLink = (companyId, hotelId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/hotels/${hotelId}/send-payment-link`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Mails login credentials to people at a business unit.
 *
 * `userIds` narrows to a chosen few (UM-12). Omitted, it still means everyone
 * mapped to the unit — the server treats an empty list as no selection rather
 * than as nobody, so a picker with nothing ticked cannot silently send zero.
 */
export const sendBUCredentials = (companyId, hotelId, userIds = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/hotels/${hotelId}/send-credentials`,
        userIds?.length ? { user_ids: userIds } : {}
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const sendBatchPaymentLinks = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/send-batch-payment-links`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getHotelPaymentInfo = (hotelId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/hotel-payment/${hotelId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createHotelPaymentOrder = (hotelId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/hotel-payment/create-order`,
        { hotel_id: hotelId }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const verifyHotelPayment = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/hotel-payment/verify`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getVendorMappings = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/hospitality/vendor/my-mappings`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });



/** HN-2: what would happen if this business unit were removed. */
export const previewHotelDeletion = (companyId, hotelId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/hotels/${hotelId}/delete-preflight`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/** `archive: true` hides it instead of removing it. */
export const removeHotel = (companyId, hotelId, { archive = false } = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/hospitality/company/${companyId}/hotels/${hotelId}${archive ? "?archive=true" : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const restoreHotel = (companyId, hotelId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/hotels/${hotelId}/restore`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
