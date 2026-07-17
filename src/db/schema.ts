import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "inspector"] })
    .notNull()
    .default("inspector"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  plate: text("plate"),
  buyerName: text("buyer_name"),
  vin: text("vin").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id")
    .notNull()
    .references(() => checklistTemplates.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const inspections = sqliteTable("inspections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  inspectorId: integer("inspector_id")
    .notNull()
    .references(() => users.id),
  templateId: integer("template_id")
    .notNull()
    .references(() => checklistTemplates.id),
  odometer: integer("odometer"),
  status: text("status", { enum: ["in_progress", "completed"] })
    .notNull()
    .default("in_progress"),
  notes: text("notes"),
  diagramUrl: text("diagram_url"),
  diagramLabels: text("diagram_labels"),
  startedAt: text("started_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at"),
});

export const inspectionResults = sqliteTable("inspection_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inspectionId: integer("inspection_id")
    .notNull()
    .references(() => inspections.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => checklistItems.id),
  status: text("status", { enum: ["pass", "fail", "na"] }).notNull(),
  notes: text("notes"),
});

export const inspectionMedia = sqliteTable("inspection_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resultId: integer("result_id")
    .notNull()
    .references(() => inspectionResults.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: text("type", { enum: ["image", "video"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
