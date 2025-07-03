export interface ShippingAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddressFormData {
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

export const CHIHUAHUA_SHIPPING_COST = 120;
export const OTHER_STATES_SHIPPING_COST = 200;

// Variaciones comunes del estado de Chihuahua
export const CHIHUAHUA_VARIATIONS = [
  'chihuahua',
  'chih',
  'chih.',
  'chihuahua, mexico',
  'estado de chihuahua',
  'chihuahua, méxico',
  'chihuahua mexico',
  'chihuahua méxico'
];

export function calculateShippingCost(state: string): number {
  const normalizedState = state.toLowerCase().trim();
  const isChihuahua = CHIHUAHUA_VARIATIONS.some(variation => 
    normalizedState.includes(variation)
  );
  
  return isChihuahua ? CHIHUAHUA_SHIPPING_COST : OTHER_STATES_SHIPPING_COST;
}