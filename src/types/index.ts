export interface Appointment {
  id: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
  patientName?: string;
  patientEmail?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  status: 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  ttl?: number;
}

export interface CreateAppointmentRequest {
  insuredId: string;
  scheduleId: number;
  countryISO: string;
  patientName?: string;
  patientEmail?: string;
  doctorName?: string;
  status?: 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  specialty?: string;
  date?: string;
  time?: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  insuredId?: string;
  scheduleId?: number;
  countryISO?: string;
  patientName?: string;
  patientEmail?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  completedAt?: string;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  body: string;
  headers?: {
    [key: string]: string;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
} 