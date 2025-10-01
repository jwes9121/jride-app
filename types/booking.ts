// /types/booking.ts
export interface Booking {
  id: string
  customer_name: string
  pickup_location: string
  dropoff_location: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  created_at: string
  driver_id?: string
  notes?: string
}
