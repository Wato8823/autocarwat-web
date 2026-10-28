export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
}

export interface Part {
  id: number;
  name: string;
  reference: string;
  oem_number: string | null;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category?: string;
  brand?: string;
  vehicles?: Vehicle[];
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface PartFilters {
  search?: string;
  vehicle_id?: number | null;
  page?: number;
}
