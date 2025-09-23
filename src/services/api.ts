const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.voicenotescribe.com/api';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

interface AuthResponse {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    name: string; // For backward compatibility
    email: string;
    wtp_number?: string;
    language: string;
    is_premium: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  wtp_number?: string;
  password: string;
  language?: string;
  country_code?: number;
}

interface LoginData {
  email: string;
  password: string;
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // If token expired or unauthorized, redirect to login
        if (response.status === 401 && (data.message?.toLowerCase().includes('token expired') || data.message?.toLowerCase().includes('unauthorized'))) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.replace('/signin');
        }
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Auth endpoints
  async signup(userData: SignupData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(refreshToken: string): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    return this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request<any>('/users/profile', {
      method: 'GET',
    });
  }

  async updateProfile(profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    country_code?: number;
    password?: string;
    wtp_number?: string;
    wa_language?: number;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getCountries(): Promise<ApiResponse<any>> {
    return this.request<any>('/users/countries', { method: 'GET' });
  }

  async getLanguages(): Promise<ApiResponse<any>> {
    return this.request<any>('/users/languages', { method: 'GET' });
  }

  async updateWhatsAppTranscript(data: { 
    country_code?: number; 
    wtp_number?: string; 
    wa_language?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    password?: string;
  }): Promise<ApiResponse<any>> {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/users/update-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return result;
  }

  // Stripe endpoints
  async createCheckoutSession(data: { priceId: string; planType?: string; email?: string }): Promise<ApiResponse<any>> {
    return this.request<any>('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubscriptionStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/stripe/subscription-status', {
      method: 'GET',
    });
  }

  async getSubscriptionDetails(): Promise<ApiResponse<any>> {
    return this.request<any>('/stripe/subscription-details', {
      method: 'GET',
    });
  }

  async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/stripe/payment-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async verifyPaymentSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.request<any>('/stripe/verify-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async cancelSubscription(): Promise<ApiResponse<any>> {
    return this.request<any>('/stripe/cancel-subscription', {
      method: 'POST',
    });
  }

  async reactivateSubscription(): Promise<ApiResponse<any>> {
    return this.request<any>('/stripe/reactivate-subscription', {
      method: 'POST',
    });
  }

  // Transcription endpoints
  async getTranscriptionHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `/transcriptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getTranscriptionStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/transcriptions/stats', {
      method: 'GET',
    });
  }

  async deleteTranscription(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/transcriptions/${id}`, {
      method: 'DELETE',
    });
  }

  async refreshTranscriptionFromS3(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/transcriptions/${id}/refresh`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
export type { SignupData, LoginData, AuthResponse }; 