export type UserRole = 'super_admin' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string | null;
  name: string;
  business_name: string;
  email: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  status: 'active' | 'suspended';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  client_id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  start_date: string;
  end_date: string | null;
  total_cost: number;
  advance_paid: number;
  remaining_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  service_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed';
  notes: string | null;
  created_at: string;
}

export interface AdBudget {
  id: string;
  client_id: string;
  total_budget: number;
  amount_spent: number;
  remaining_budget: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'unpaid' | 'overdue';
  file_url: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  file_url: string;
  report_date: string;
  created_at: string;
}

export interface Document {
  id: string;
  client_id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  type: 'invoice' | 'contract' | 'report' | 'project_file';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'welcome' | 'payment_reminder' | 'payment_confirmation' | 'service_update' | 'report_uploaded' | 'invoice_uploaded';
  read: boolean;
  created_at: string;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  email_subject: string;
  email_body: string;
  whatsapp_body: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
}
