import { axiosInstance } from '@/shared/lib/axiosInstance';

export const fetchChurches = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/churches');
    return response.data?.churches || [];
  } catch (error) {
    console.error('Error fetching churches for OCR:', error);
    return [];
  }
};

export default { fetchChurches };
