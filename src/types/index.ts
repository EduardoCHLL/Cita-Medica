export interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface CreateAppointmentRequest {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  patientName?: string;
  patientEmail?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
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