export interface ItemRow {
  item_id: string;
  description: string;
  category: string;
  subcategory?: string;
  color?: string;
  finish?: string;
  gauge?: string;
  unit: string;
  notes?: string;
  profile_image?: string;
  dimensions?: string;
}

export const ITEM_COLUMNS = [
  { header: "Item ID", key: "item_id", width: 20 },
  { header: "Description", key: "description", width: 40 },
  { header: "Category", key: "category", width: 20 },
  { header: "Subcategory", key: "subcategory", width: 20 },
  { header: "Color", key: "color", width: 15 },
  { header: "Finish", key: "finish", width: 15 },
  { header: "Gauge", key: "gauge", width: 10 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Dimensions", key: "dimensions", width: 25 },
  { header: "Notes", key: "notes", width: 40 },
  { header: "Profile Image", key: "profile_image", width: 25 },
];

export const STOCK_COLUMNS = [
  { header: "Item ID", key: "item_id", width: 20 },
  { header: "Description", key: "description", width: 40 },
  { header: "Category", key: "category", width: 20 },
  { header: "Location", key: "location", width: 20 },
  { header: "Quantity", key: "quantity", width: 12 },
  { header: "Unit", key: "unit", width: 10 },
];
