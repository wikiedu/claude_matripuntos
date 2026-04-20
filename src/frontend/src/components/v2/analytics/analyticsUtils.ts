import { apiClient } from '../../../services/apiClient'

export const fetchAnalytics = (path: string) => apiClient.request(path).then((r: any) => r.data)
