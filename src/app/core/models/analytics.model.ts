export interface PeopleCount {
  id: string;
  bmapp_id?: string;
  camera_name?: string;
  task_session?: string;
  count_in: number;
  count_out: number;
  total: number;
  record_time: string;
  extra_data?: any;
  synced_at: string;
}

export interface ZoneOccupancy {
  id: string;
  bmapp_id?: string;
  camera_name?: string;
  task_session?: string;
  zone_name?: string;
  people_count: number;
  record_time: string;
  extra_data?: any;
  synced_at: string;
}

export interface ZoneOccupancyAvg {
  id: string;
  bmapp_id?: string;
  camera_name?: string;
  task_session?: string;
  zone_name?: string;
  avg_count: number;
  period_start: string;
  period_end?: string;
  extra_data?: any;
  synced_at: string;
}

export interface StoreCount {
  id: string;
  bmapp_id?: string;
  camera_name?: string;
  task_session?: string;
  entry_count: number;
  exit_count: number;
  record_date: string;
  extra_data?: any;
  synced_at: string;
}

export interface StayDuration {
  id: string;
  bmapp_id?: string;
  camera_name?: string;
  task_session?: string;
  zone_name?: string;
  avg_duration: number;
  max_duration: number;
  min_duration: number;
  sample_count: number;
  record_time: string;
  extra_data?: any;
  synced_at: string;
}

export interface Schedule {
  id: string;
  bmapp_id?: string;
  task_session?: string;
  schedule_name?: string;
  schedule_type?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string;
  is_enabled: boolean;
  extra_data?: any;
  synced_at: string;
}

export interface SensorDevice {
  id: string;
  bmapp_id?: string;
  device_name: string;
  device_type?: string;
  location?: string;
  is_online: boolean;
  extra_data?: any;
  synced_at: string;
}

export interface SensorData {
  id: string;
  bmapp_id?: string;
  sensor_device_id?: string;
  sensor_bmapp_id?: string;
  value: number;
  unit?: string;
  record_time: string;
  extra_data?: any;
  synced_at: string;
}

export interface AnalyticsSyncResult {
  entity: string;
  synced: number;
  errors: string[];
}

// BM-APP live data types (directly from BM-APP API)

export interface BmappSchedule {
  Id: number;
  Name: string;
  Summary: string;
  Value: string;
}

export interface BmappSensor {
  name: string;
  type: number;
  unique?: string;
  protocol?: string;
  extra_params?: any[];
  create_ms?: number;
  extra?: any;
}

export interface SensorDeviceType {
  name: string;
  type: number;
  unique: string;
  protocol: string;
  extra_params: SensorDeviceTypeParam[];
}

export interface SensorDeviceTypeParam {
  key: string;
  name: string;
  type: number;
  class: string;
  default?: any;
  value?: any;
  desc?: string;
  required?: boolean;
  scope?: number;
  enable?: boolean;
  options?: { key: string; name: string; value: string; enable: boolean }[];
}
