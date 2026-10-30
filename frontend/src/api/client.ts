import {
  AuthResponse,
  Project,
  Model,
  HardwareDevice,
  Benchmark,
  Analysis,
  Recommendation,
  Supplier,
  SupplierRequest,
  Report,
  User,
} from './types';

const RAW_BASE_URL = import.meta.env.VITE_API_URL;
// If VITE_API_URL is explicitly configured, use it.
// Otherwise default to relative '' so all requests use same-origin /api routes
// (proxied by Vite dev server locally to port 8000, and handled by Vercel serverless in production)
const API_BASE_URL = RAW_BASE_URL || '';

class ApiClient {
  private get token(): string | null {
    return localStorage.getItem('bharat_ai_token');
  }

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem('bharat_ai_token', token);
    } else {
      localStorage.removeItem('bharat_ai_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const apiPath = path.startsWith('/api') ? path : `/api${path}`;
    const url = `${API_BASE_URL}${apiPath}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return {} as T;
    }

    let data: any = null;
    let rawText = '';
    try {
      rawText = await res.text();
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401) {
        this.setToken(null);
      }
      let message =
        data?.detail ||
        data?.error ||
        data?.message;

      if (!message) {
        if (rawText && rawText.length < 200 && !rawText.includes('<html')) {
          message = rawText.trim();
        } else if (res.status === 500) {
          message = 'Server error (500). Please check backend connection and database status.';
        } else if (res.status === 404) {
          message = `Resource not found (404) at ${apiPath}`;
        } else {
          message = `API error ${res.status}${res.statusText ? `: ${res.statusText}` : ''}`;
        }
      }

      throw new Error(message);
    }

    return data as T;
  }

  // Auth
  async signup(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async me(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(name: string, description?: string): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateProject(id: number, name?: string, description?: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteProject(id: number): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Models
  async uploadModel(projectId: number, file: File): Promise<Model> {
    const formData = new FormData();
    formData.append('project_id', projectId.toString());
    formData.append('file', file);

    return this.request<Model>('/models/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getModel(id: number): Promise<Model> {
    return this.request<Model>(`/models/${id}`);
  }

  async getProjectModels(projectId: number): Promise<Model[]> {
    return this.request<Model[]>(`/projects/${projectId}/models`);
  }

  async loadSampleModel(projectId: number, sampleName: string): Promise<Model> {
    return this.request<Model>(`/projects/${projectId}/load-sample?sample_name=${encodeURIComponent(sampleName)}`, {
      method: 'POST',
    });
  }

  // Hardware
  async getHardware(category?: string, isIndian?: boolean): Promise<HardwareDevice[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (isIndian !== undefined) params.append('is_indian', String(isIndian));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<HardwareDevice[]>(`/hardware${qs}`);
  }

  async getHardwareDevice(id: number): Promise<HardwareDevice> {
    return this.request<HardwareDevice>(`/hardware/${id}`);
  }

  // Benchmarks
  async getBenchmarks(deviceId?: number, modelName?: string): Promise<Benchmark[]> {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', String(deviceId));
    if (modelName) params.append('model_name', modelName);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Benchmark[]>(`/benchmarks${qs}`);
  }

  // Analyses & Recommendations
  async getModelAnalyses(modelId: number): Promise<Analysis[]> {
    return this.request<Analysis[]>(`/models/${modelId}/analyses`);
  }

  async getAnalysis(analysisId: number): Promise<Analysis> {
    return this.request<Analysis>(`/analyses/${analysisId}`);
  }

  async getProjectRecommendations(projectId: number): Promise<Recommendation[]> {
    return this.request<Recommendation[]>(`/projects/${projectId}/recommendations`);
  }

  // Suppliers & Requests
  async getSuppliers(city?: string, brand?: string): Promise<Supplier[]> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (brand) params.append('brand', brand);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Supplier[]>(`/suppliers${qs}`);
  }

  async createSupplierRequest(payload: {
    supplier_id: number;
    project_id?: number;
    device_name?: string;
    quantity: number;
    use_case: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
  }): Promise<SupplierRequest> {
    return this.request<SupplierRequest>('/suppliers/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUserSupplierRequests(): Promise<SupplierRequest[]> {
    return this.request<SupplierRequest[]>('/suppliers/requests');
  }

  // Reports
  async getProjectReports(projectId: number): Promise<Report[]> {
    return this.request<Report[]>(`/projects/${projectId}/reports`);
  }

  async downloadReportPdf(projectId: number): Promise<Blob> {
    const path = `/projects/${projectId}/report/pdf`;
    const normalizedPath =
      API_BASE_URL === '' && !path.startsWith('/api') ? `/api${path}` : path;
    const url = `${API_BASE_URL}${normalizedPath}`;

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to generate PDF: ${res.statusText || res.status}`);
    }
    return res.blob();
  }
}

export const api = new ApiClient();
