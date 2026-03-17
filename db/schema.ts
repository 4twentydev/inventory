import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  itemId: text("item_id").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  color: text("color"),
  finish: text("finish"),
  gauge: text("gauge"),
  unit: text("unit").notNull().default("ea"),
  notes: text("notes"),
  profileImage: text("profile_image"),
  dimensions: text("dimensions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stock = pgTable(
  "stock",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
  },
  (t) => [unique().on(t.itemId, t.locationId)],
);

export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  type: text("type", {
    enum: ["add", "remove", "transfer", "adjustment"],
  }).notNull(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  fromLocationId: integer("from_location_id").references(() => locations.id),
  toLocationId: integer("to_location_id").references(() => locations.id),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countSessions = pgTable("count_sessions", {
  id: serial("id").primaryKey(),
  name: text("name"),
  locationId: integer("location_id").references(() => locations.id),
  status: text("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  createdBy: integer("created_by").references(() => users.id),
});

export const countEntries = pgTable("count_entries", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => countSessions.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  locationId: integer("location_id").references(() => locations.id),
  systemQty: integer("system_qty").notNull().default(0),
  countedQty: integer("counted_qty"),
  notes: text("notes"),
});

export type User = typeof users.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Stock = typeof stock.$inferSelect;
export type Movement = typeof movements.$inferSelect;
export type CountSession = typeof countSessions.$inferSelect;
export type CountEntry = typeof countEntries.$inferSelect;
