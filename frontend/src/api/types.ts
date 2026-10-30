export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSpecification {
  model_name: string;
  model_type: string;
  parameter_count_b: number;
  precision: string;
  workload: string;
  target_environment: string;
  target_latency_ms?: number | null;
  target_throughput?: number | null;
  max_budget_inr?: number | null;
  max_power_w?: number | null;
  context_length: number;
  batch_size: number;
  concurrent_users: number;
  priority: string;
  prefer_indian: boolean;
}

export interface Model {
  id: number;
  project_id: number;
  filename: string;
  framework: string;
  parameters: number | null;
  flops: number | null;
  memory: number | null;
  precision: string | null;
  input_resolution: string | null;
  created_at: string;
}

export interface HardwareDevice {
  id: number;
  name: string;
  vendor: string;
  category: string;
  tops_int8: number | null;
  tflops_fp16: number | null;
  memory_gb: number;
  memory_bandwidth_gbps: number | null;
  tdp_w: number;
  price_inr: number;
  is_indian: boolean;
  availability_in_india: string;
  source_url: string;
  confidence_level: 'verified_datasheet' | 'vendor_benchmark' | 'estimated' | string;
  notes?: string | null;
  created_at: string;
}

export interface Benchmark {
  id: number;
  device_id: number | null;
  device_name: string;
  model_name: string;
  model_family: string | null;
  precision: string;
  batch_size: number;
  latency_ms: number;
  throughput_fps: number;
  power_w: number | null;
  source: string;
  created_at: string;
}

export interface Analysis {
  id: number;
  model_id: number;
  model_family: 'CNN' | 'Transformer' | 'RNN' | 'Other' | string;
  parameters_count: number;
  flops: number;
  macs: number | null;
  activation_memory_mb: number | null;
  weight_memory_mb: number | null;
  total_memory_mb: number;
  input_shape: string;
  precision: string;
  op_histogram?: Record<string, number> | null;
  analysis_summary?: string | null;
  created_at: string;
}

export interface Recommendation {
  id: number;
  analysis_id: number;
  project_id: number;
  device_id: number;
  category: 'Best Overall' | 'Best Performance' | 'Best Cost' | 'Best Power' | 'Best Indian Alternative' | string;
  score: number;
  predicted_latency_ms: number;
  predicted_power_w: number;
  confidence_interval_latency?: string | null;
  confidence_interval_power?: string | null;
  rationale: string;
  created_at: string;
  device?: HardwareDevice;
}

export interface Supplier {
  id: number;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  brands: string;
  services: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string;
  is_verified: boolean;
  notes?: string | null;
  created_at: string;
}

export interface SupplierRequest {
  id: number;
  supplier_id: number;
  user_id: number;
  project_id: number | null;
  device_name: string | null;
  quantity: number;
  use_case: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  created_at: string;
  supplier?: Supplier;
}

export interface Report {
  id: number;
  project_id: number;
  model_id: number | null;
  title: string;
  file_path: string | null;
  summary_json?: Record<string, any> | null;
  created_at: string;
}

